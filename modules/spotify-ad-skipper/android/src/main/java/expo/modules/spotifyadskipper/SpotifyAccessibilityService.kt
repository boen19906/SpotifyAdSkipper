package expo.modules.spotifyadskipper

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.GestureDescription
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.graphics.Path
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo

class SpotifyAccessibilityService : AccessibilityService() {
    companion object {
        private const val TAG = "SpotifyAccessService"
        var instance: SpotifyAccessibilityService? = null
        val isRunning: Boolean get() = instance != null

        fun requestForceStop(context: Context) {
            Log.i(TAG, "Requesting automated Force Stop via AccessibilityService")
            try {
                val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                    data = Uri.parse("package:${SpotifyAdSkipController.SPOTIFY_PACKAGE}")
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                    )
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch App Details settings for Spotify", e)
            }

            // Proactively poll every 150ms in case window events are suppressed while waking up
            instance?.startForceStopPolling()
        }

        fun lockScreen() {
            try {
                Log.i(TAG, "Executing GLOBAL_ACTION_LOCK_SCREEN to restore screen-off state")
                instance?.performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to perform GLOBAL_ACTION_LOCK_SCREEN", e)
            }
        }
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        instance = this
        Log.i(TAG, "SpotifyAccessibilityService connected and ready")
    }

    override fun onDestroy() {
        super.onDestroy()
        instance = null
        Log.i(TAG, "SpotifyAccessibilityService destroyed")
    }

    override fun onInterrupt() {
        Log.w(TAG, "SpotifyAccessibilityService interrupted")
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (!SpotifyAdSkipController.isAutomatingForceStop) {
            return
        }

        processActiveSettingsWindow()
    }

    fun startForceStopPolling() {
        val handler = Handler(Looper.getMainLooper())
        var attempts = 0

        // Dismiss swipe screen if device is kept unlocked by Extend Unlock
        dismissSwipeLockIfPresent()

        val pollRunnable = object : Runnable {
            override fun run() {
                if (!SpotifyAdSkipController.isAutomatingForceStop || attempts >= 24) {
                    return
                }
                attempts++
                if (attempts == 2 || attempts == 4) {
                    dismissSwipeLockIfPresent()
                }
                if (!processActiveSettingsWindow()) {
                    handler.postDelayed(this, 150L)
                }
            }
        }
        handler.postDelayed(pollRunnable, 200L)
    }

    private fun dismissSwipeLockIfPresent() {
        try {
            val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager
            // If device is NOT securely locked (e.g. Extend Unlock is active) but keyguard is showing
            if (keyguardManager != null && !keyguardManager.isDeviceLocked && keyguardManager.isKeyguardLocked) {
                Log.i(TAG, "Extend Unlock is active: dispatching swipe-up gesture to dismiss swipe lockscreen")
                val displayMetrics = resources.displayMetrics
                val centerX = displayMetrics.widthPixels / 2f
                val startY = displayMetrics.heightPixels * 0.8f
                val endY = displayMetrics.heightPixels * 0.2f

                val path = Path().apply {
                    moveTo(centerX, startY)
                    lineTo(centerX, endY)
                }
                val stroke = GestureDescription.StrokeDescription(path, 0, 150)
                val gesture = GestureDescription.Builder().addStroke(stroke).build()
                dispatchGesture(gesture, null, null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error checking or dispatching swipe lockscreen gesture", e)
        }
    }

    private fun processActiveSettingsWindow(): Boolean {
        if (!SpotifyAdSkipController.isAutomatingForceStop) {
            return false
        }

        val rootNode = getSettingsRootNode() ?: return false

        try {
            // STEP 1: Check for Force Stop confirmation dialog first
            if (tryClickDialogConfirmation(rootNode)) {
                return true
            }

            // STEP 2: Look for the specific "Force stop" button in the App Info page
            if (tryClickForceStopButton(rootNode)) {
                Log.d(TAG, "Triggered Force stop button, waiting for confirmation dialog")
                return true
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error handling accessibility event", e)
        }
        return false
    }

    fun getSettingsRootNode(): AccessibilityNodeInfo? {
        rootInActiveWindow?.let {
            if (it.packageName?.toString()?.contains("settings", ignoreCase = true) == true) {
                return it
            }
        }

        // Also search through all active windows (necessary when keyguard or notification shade is on top)
        try {
            for (window in windows) {
                val root = window.root ?: continue
                if (root.packageName?.toString()?.contains("settings", ignoreCase = true) == true) {
                    return root
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error querying windows in AccessibilityService", e)
        }
        return rootInActiveWindow
    }

    private fun tryClickDialogConfirmation(root: AccessibilityNodeInfo): Boolean {
        // SAFETY CHECK: Verify that this is specifically the "Force stop" confirmation dialog
        val alertTitles = root.findAccessibilityNodeInfosByViewId("com.android.settings:id/alertTitle")
        val messages = root.findAccessibilityNodeInfosByViewId("android:id/message")

        var isForceStopDialog = false
        for (node in alertTitles) {
            if (node.text?.toString()?.contains("Force stop", ignoreCase = true) == true) {
                isForceStopDialog = true
                break
            }
        }

        for (node in messages) {
            if (node.text?.toString()?.contains("force stop", ignoreCase = true) == true) {
                isForceStopDialog = true
                break
            }
        }

        if (!isForceStopDialog) {
            // Do NOT click OK on any other dialog (such as uninstall, archive, etc.)
            return false
        }

        // On the Force stop dialog, the confirm button has ID android:id/button1 and text "OK"
        val button1Nodes = root.findAccessibilityNodeInfosByViewId("android:id/button1")
        for (node in button1Nodes) {
            val text = node.text?.toString()?.trim() ?: ""
            if (text.equals("OK", ignoreCase = true) || text.equals("Force stop", ignoreCase = true)) {
                if (node.isClickable && node.isEnabled) {
                    Log.i(TAG, "Confirming Force stop dialog: clicking '$text'")
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    finishForceStop()
                    return true
                }
            }
        }

        return false
    }

    private fun tryClickForceStopButton(root: AccessibilityNodeInfo): Boolean {
        // STRICT CHECK: We ONLY look for nodes with exact text "Force stop"
        val forceStopNodes = root.findAccessibilityNodeInfosByText("Force stop")
        for (node in forceStopNodes) {
            val text = node.text?.toString()?.trim() ?: ""
            // Strict match: must equal "Force stop", not "Archive" or "Uninstall"
            if (text.equals("Force stop", ignoreCase = true)) {
                if (node.isClickable && node.isEnabled) {
                    Log.i(TAG, "Clicking exact Force stop button (ID: ${node.viewIdResourceName})")
                    node.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    return true
                }

                val parent = node.parent
                if (parent != null && parent.isClickable && parent.isEnabled) {
                    Log.i(TAG, "Clicking Force stop parent container")
                    parent.performAction(AccessibilityNodeInfo.ACTION_CLICK)
                    return true
                }
            }
        }

        return false
    }

    private fun finishForceStop() {
        Log.i(TAG, "Force stop confirmed successfully via AccessibilityService")
        SpotifyAdSkipController.isAutomatingForceStop = false

        Handler(Looper.getMainLooper()).postDelayed({
            SpotifyAdSkipController.onForceStopCompleted(applicationContext)
        }, 300)
    }
}
