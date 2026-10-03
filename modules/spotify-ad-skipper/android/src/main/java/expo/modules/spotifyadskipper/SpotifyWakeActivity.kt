package expo.modules.spotifyadskipper

import android.app.Activity
import android.app.KeyguardManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.WindowManager
import java.util.concurrent.atomic.AtomicBoolean

class SpotifyWakeActivity : Activity() {
    companion object {
        private const val TAG = "SpotifyWakeActivity"

        fun launch(context: Context) {
            Log.i(TAG, "Launching SpotifyWakeActivity to wake display and dismiss lockscreen")
            try {
                val intent = Intent(context, SpotifyWakeActivity::class.java).apply {
                    addFlags(
                        Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_NO_ANIMATION
                    )
                }
                context.startActivity(intent)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to launch SpotifyWakeActivity", e)
            }
        }
    }

    private val hasProceeded = AtomicBoolean(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        Log.i(TAG, "SpotifyWakeActivity onCreate: turning on screen and showing over lockscreen")

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O_MR1) {
            setShowWhenLocked(true)
            setTurnScreenOn(true)
        }
        @Suppress("DEPRECATION")
        window.addFlags(
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
            WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_ALLOW_LOCK_WHILE_SCREEN_ON
        )

        // Ensure a view is set and drawn so WindowManager treats the window as ready to turn display on
        val view = android.view.View(this)
        view.setBackgroundColor(android.graphics.Color.TRANSPARENT)
        setContentView(view)

        // Safety timeout: if Keyguard callback hangs or takes too long, proceed anyway after 600ms
        Handler(Looper.getMainLooper()).postDelayed({
            if (!hasProceeded.get()) {
                Log.w(TAG, "Keyguard dismiss callback timed out, proceeding to Force Stop")
                proceedToForceStop()
            }
        }, 600L)

        val keyguardManager = getSystemService(Context.KEYGUARD_SERVICE) as? KeyguardManager

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O && keyguardManager != null && keyguardManager.isKeyguardLocked) {
            Log.i(TAG, "Requesting keyguard dismissal (automatic under Extend Unlock)...")
            keyguardManager.requestDismissKeyguard(this, object : KeyguardManager.KeyguardDismissCallback() {
                override fun onDismissSucceeded() {
                    super.onDismissSucceeded()
                    Log.i(TAG, "Keyguard dismissal succeeded! Launching Force Stop settings...")
                    proceedToForceStop()
                }

                override fun onDismissError() {
                    super.onDismissError()
                    Log.w(TAG, "Keyguard dismissal error, proceeding to Force Stop anyway")
                    proceedToForceStop()
                }

                override fun onDismissCancelled() {
                    super.onDismissCancelled()
                    Log.w(TAG, "Keyguard dismissal cancelled, proceeding anyway")
                    proceedToForceStop()
                }
            })
        } else {
            proceedToForceStop()
        }
    }

    private fun proceedToForceStop() {
        if (!hasProceeded.compareAndSet(false, true)) return
        SpotifyAccessibilityService.requestForceStop(this)
        Handler(Looper.getMainLooper()).postDelayed({
            finish()
            overridePendingTransition(0, 0)
        }, 400L)
    }
}
