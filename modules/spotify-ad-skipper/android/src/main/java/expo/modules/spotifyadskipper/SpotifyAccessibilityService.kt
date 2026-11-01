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
import android.view.accessibility.AccessibilityWindowInfo

class SpotifyAccessibilityService : AccessibilityService() {
    companion object {
        private const val TAG = "SpotifyAccessService"
        var instance: SpotifyAccessibilityService? = null
        val isRunning: Boolean get() = instance != null

        @Volatile
        var lastForegroundPackage: String? = null

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

        fun returnToHomeScreen(context: Context) {
            Log.i(TAG, "Executing return to Home screen")
            var navigated = false
            try {
                navigated = instance?.performGlobalAction(GLOBAL_ACTION_HOME) == true
            } catch (e: Exception) {
                Log.w(TAG, "performGlobalAction(GLOBAL_ACTION_HOME) failed", e)
            }
            if (!navigated) {
                try {
                    val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                        addCategory(Intent.CATEGORY_HOME)
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_NO_ANIMATION)
                    }
                    context.startActivity(homeIntent)
                    Log.i(TAG, "Dispatched HOME intent as fallback")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to dispatch HOME intent", e)
                }
            }
        }

        fun isLauncherPackage(context: Context, packageName: String?): Boolean {
            if (packageName.isNullOrBlank()) return true
            try {
                val intent = Intent(Intent.ACTION_MAIN).addCategory(Intent.CATEGORY_HOME)
                val resolveInfo = context.packageManager.resolveActivity(intent, 0)
                val defaultLauncher = resolveInfo?.activityInfo?.packageName
                if (defaultLauncher != null && defaultLauncher.equals(packageName, ignoreCase = true)) {
                    return true
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error resolving default launcher", e)
            }
            val knownLaunchers = setOf(
                "com.sec.android.app.launcher",
                "com.google.android.apps.nexuslauncher",
                "com.android.launcher3",
                "com.android.launcher",
                "com.miui.home",
                "com.huawei.android.launcher",
                "com.oppo.launcher",
                "com.oneplus.launcher",
                "com.teslacoilsw.launcher",
                "com.microsoft.launcher",
                "com.actionlauncher.playstore",
                "com.smartlauncher.smartlauncher"
            )
            return knownLaunchers.contains(packageName.lowercase())
        }

        private fun isValidCandidatePackage(context: Context, pkg: String?): Boolean {
            if (pkg.isNullOrBlank()) return false
            val p = pkg.lowercase()
            if (p.contains("settings")) return false
            if (p == "com.android.systemui") return false
            if (p.startsWith("android")) return false
            return true
        }

        fun getActiveForegroundPackage(context: Context): String? {
            // 1. Try active window root node
            try {
                val root = instance?.rootInActiveWindow
                val pkg = root?.packageName?.toString()
                if (isValidCandidatePackage(context, pkg)) {
                    Log.d(TAG, "Identified active package from rootInActiveWindow: $pkg")
                    return pkg
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error checking rootInActiveWindow", e)
            }

            // 2. Try window list
            try {
                val windowList = instance?.windows
                if (windowList != null) {
                    for (window in windowList) {
                        if (window.type == AccessibilityWindowInfo.TYPE_APPLICATION && (window.isActive || window.isFocused)) {
                            val pkg = window.root?.packageName?.toString()
                            if (isValidCandidatePackage(context, pkg)) {
                                Log.d(TAG, "Identified active package from window list: $pkg")
                                return pkg
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                Log.w(TAG, "Error inspecting accessibility window list", e)
            }

            // 3. Fall back to tracked lastForegroundPackage
            if (isValidCandidatePackage(context, lastForegroundPackage)) {
                Log.d(TAG, "Falling back to tracked lastForegroundPackage: $lastForegroundPackage")
                return lastForegroundPackage
            }

            return lastForegroundPackage
        }

        fun restoreAppOrWindow(context: Context, targetPackage: String?) {
            Log.i(TAG, "Restoring previous app/window: target='$targetPackage'")

            if (targetPackage.isNullOrBlank() || isLauncherPackage(context, targetPackage)) {
                Log.i(TAG, "Previous state was Home screen or empty. Returning to Home screen.")
                returnToHomeScreen(context)
                return
            }

            if (targetPackage.equals(SpotifyAdSkipController.SPOTIFY_PACKAGE, ignoreCase = true)) {
                Log.i(TAG, "Previous state was Spotify itself. Keeping Spotify open.")
                return
            }

            try {
                val launchIntent = context.packageManager.getLaunchIntentForPackage(targetPackage)
                if (launchIntent != null) {
                    launchIntent.addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                    )
                    context.startActivity(launchIntent)
                    Log.i(TAG, "Successfully restored previous app: $targetPackage")
                } else {
                    Log.w(TAG, "No launch intent found for $targetPackage. Returning to Home screen as fallback.")
                    returnToHomeScreen(context)
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to restore app $targetPackage", e)
                returnToHomeScreen(context)
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
        if (event == null) return

        if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            val pkg = event.packageName?.toString()
            if (!pkg.isNullOrBlank() &&
                !pkg.contains("settings", ignoreCase = true) &&
                pkg != "com.android.systemui" &&
                !SpotifyAdSkipController.isAutomatingForceStop &&
                !SpotifyAdSkipController.isCurrentlySkipping
            ) {
                lastForegroundPackage = pkg
                Log.d(TAG, "Recorded active foreground package: $pkg")
            }
        }

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
            try {
                performGlobalAction(GLOBAL_ACTION_BACK)
            } catch (e: Exception) {
                Log.w(TAG, "Error performing back on Settings window", e)
            }
        }, 120L)

        Handler(Looper.getMainLooper()).postDelayed({
            SpotifyAdSkipController.onForceStopCompleted(applicationContext)
        }, 300)
    }
}
