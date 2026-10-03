package expo.modules.spotifyadskipper

import android.app.ActivityManager
import android.content.Context
import android.content.Intent
import android.media.AudioManager
import android.media.MediaMetadata
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.PowerManager
import android.os.SystemClock
import android.util.Log
import android.view.KeyEvent
import java.util.concurrent.atomic.AtomicBoolean

object SpotifyAdSkipController {
    private const val TAG = "SpotifyAdSkipCtrl"
    const val SPOTIFY_PACKAGE = "com.spotify.music"
    private const val PREFS_NAME = "spotify_ad_skip_prefs"
    private const val KEY_ENABLED = "is_enabled"
    private const val KEY_AUTO_MUTE = "auto_mute"
    private const val KEY_RESTART_DELAY = "restart_delay_ms"
    private const val KEY_RELAUNCH_WAIT = "relaunch_wait_ms"

    var isEnabled: Boolean = true
    var autoMute: Boolean = true
    var restartDelayMs: Long = 800L
    var relaunchWaitMs: Long = 2500L
    var adSettleDelayMs: Long = 2000L
    var skipCount: Int = 0

    fun loadPreferences(context: Context) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            isEnabled = prefs.getBoolean(KEY_ENABLED, true)
            autoMute = prefs.getBoolean(KEY_AUTO_MUTE, true)
            restartDelayMs = prefs.getLong(KEY_RESTART_DELAY, 800L)
            relaunchWaitMs = prefs.getLong(KEY_RELAUNCH_WAIT, 2500L)
            Log.d(TAG, "Loaded native preferences: isEnabled=$isEnabled, autoMute=$autoMute, restartDelay=$restartDelayMs, relaunchWait=$relaunchWaitMs")
        } catch (e: Exception) {
            Log.w(TAG, "Error loading native preferences", e)
        }
    }

    fun savePreferences(context: Context) {
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit()
                .putBoolean(KEY_ENABLED, isEnabled)
                .putBoolean(KEY_AUTO_MUTE, autoMute)
                .putLong(KEY_RESTART_DELAY, restartDelayMs)
                .putLong(KEY_RELAUNCH_WAIT, relaunchWaitMs)
                .apply()
            Log.d(TAG, "Saved native preferences: isEnabled=$isEnabled, autoMute=$autoMute, restartDelay=$restartDelayMs, relaunchWait=$relaunchWaitMs")
        } catch (e: Exception) {
            Log.w(TAG, "Error saving native preferences", e)
        }
    }

    var isAutomatingForceStop: Boolean = false
    private val isSkipping = AtomicBoolean(false)
    private var lastSkipTimestamp: Long = 0L
    private var savedVolume: Int = -1
    private var currentAdTitle: String = ""
    private var wakeLock: PowerManager.WakeLock? = null
    private var wasScreenOff: Boolean = false

    var lastPlayedSongTitle: String = ""
    var lastPlayedSongArtist: String = ""
    var songBeforeAd: String = ""

    var onAdDetectedListener: ((title: String, artist: String) -> Unit)? = null
    var onAdSkippedListener: ((title: String, durationSavedSeconds: Int, timestamp: Long) -> Unit)? = null
    var onMetadataChangedListener: ((track: String, artist: String, album: String, isPlaying: Boolean, isAd: Boolean) -> Unit)? = null

    fun updateCurrentTrack(track: String, artist: String, isAd: Boolean) {
        val cleanTrack = track.trim()
        val cleanArtist = artist.trim()
        if (!isAd && cleanTrack.isNotBlank() &&
            !cleanTrack.equals("Spotify", ignoreCase = true) &&
            !cleanTrack.contains("Advertisement", ignoreCase = true)) {
            lastPlayedSongTitle = cleanTrack
            lastPlayedSongArtist = cleanArtist
            Log.d(TAG, "Updated current active track: '$cleanTrack' by '$cleanArtist'")
        }
    }

    fun handleAdDetected(context: Context, trackTitle: String, artist: String, source: String) {
        if (!isEnabled) {
            Log.d(TAG, "Ad detected ($trackTitle by $artist) from $source but skipper is disabled.")
            return
        }

        val now = SystemClock.elapsedRealtime()
        // Cooldown buffer: 5 seconds to prevent double-skipping or flapping
        if (now - lastSkipTimestamp < 5000L) {
            Log.d(TAG, "Ad detected during cooldown period, ignoring: $trackTitle")
            return
        }

        if (!isSkipping.compareAndSet(false, true)) {
            Log.d(TAG, "Skip sequence already running, ignoring: $trackTitle")
            return
        }

        lastSkipTimestamp = now
        currentAdTitle = trackTitle

        // Ensure we capture the song that played immediately before the ad
        if (lastPlayedSongTitle.isBlank()) {
            val controller = SpotifyNotificationListener.getSpotifyController(context)
            val metaTitle = controller?.metadata?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
            if (metaTitle.isNotBlank() && !metaTitle.contains("Advertisement", ignoreCase = true) && !metaTitle.equals("Spotify", ignoreCase = true)) {
                lastPlayedSongTitle = metaTitle
            }
        }
        songBeforeAd = lastPlayedSongTitle
        Log.i(TAG, "Executing Spotify Ad Skip loophole for '$trackTitle' via $source. (Song before ad: '$songBeforeAd')")

        Handler(Looper.getMainLooper()).post {
            onAdDetectedListener?.invoke(trackTitle, artist)
        }

        executeLoopholeSequence(context.applicationContext, trackTitle)
    }

    fun triggerManualTestSkip(context: Context, testName: String = "Test Advertisement") {
        Log.i(TAG, "Manual test skip triggered: $testName")
        lastSkipTimestamp = 0L
        isSkipping.set(false)
        handleAdDetected(context, testName, "Spotify Sponsor", "Manual Test")
    }

    private fun executeLoopholeSequence(context: Context, adTitle: String) {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        val handler = Handler(Looper.getMainLooper())

        try {
            // STEP 1: Check screen state & acquire WakeLock so CPU doesn't sleep during the settle delay
            val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
            wasScreenOff = powerManager != null && !powerManager.isInteractive
            if (wasScreenOff) {
                Log.i(TAG, "Screen is off/sleeping. Acquiring WakeLock for settle delay and skip automation.")
                try {
                    wakeLock?.let { if (it.isHeld) it.release() }
                    @Suppress("DEPRECATION")
                    wakeLock = powerManager?.newWakeLock(
                        PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                        "spotifyadskip:wake_for_skip"
                    )
                    wakeLock?.acquire(12000L)
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to acquire screen wakeup WakeLock", e)
                }
            }

            // STEP 2: Mute audio IMMEDIATELY so zero ad audio is heard
            if (autoMute && audioManager != null) {
                savedVolume = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    audioManager.adjustStreamVolume(
                        AudioManager.STREAM_MUSIC,
                        AudioManager.ADJUST_MUTE,
                        0
                    )
                } else {
                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, 0, 0)
                }
                Log.d(TAG, "Audio muted immediately (saved volume: $savedVolume)")
            }

            // STEP 3: Wait adSettleDelayMs (2000ms) for Spotify to fully enter ad mode and commit the finished song to disk
            Log.i(TAG, "Muted ad audio. Waiting ${adSettleDelayMs}ms for Spotify player engine to commit previous track completion...")

            handler.postDelayed({
                try {
                    // STEP 4: Terminate Spotify via AccessibilityService
                    if (SpotifyAccessibilityService.isRunning) {
                        Log.i(TAG, "Settle delay finished. Using SpotifyAccessibilityService to automate Force Stop")
                        isAutomatingForceStop = true

                        if (wasScreenOff) {
                            Log.i(TAG, "Screen was off: Launching SpotifyWakeActivity to wake screen and dismiss lockscreen")
                            SpotifyWakeActivity.launch(context)
                        } else {
                            Log.i(TAG, "Screen is on: Directly requesting Force Stop via AccessibilityService")
                            SpotifyAccessibilityService.requestForceStop(context)
                        }

                        // Safety timeout in case settings dialog didn't appear or was canceled
                        handler.postDelayed({
                            if (isAutomatingForceStop) {
                                Log.w(TAG, "Accessibility force stop timed out, attempting relaunch anyway")
                                isAutomatingForceStop = false
                                onForceStopCompleted(context)
                            }
                        }, 5000L)
                    } else {
                        Log.w(TAG, "AccessibilityService is not enabled! Trying fallback process kill")
                        killSpotifyFallback(context)

                        handler.postDelayed({
                            onForceStopCompleted(context)
                        }, restartDelayMs)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error in delayed force stop trigger", e)
                    isSkipping.set(false)
                }
            }, adSettleDelayMs)

        } catch (e: Exception) {
            Log.e(TAG, "Error executing ad skip sequence", e)
            isSkipping.set(false)
        }
    }

    fun onForceStopCompleted(context: Context) {
        val handler = Handler(Looper.getMainLooper())

        handler.postDelayed({
            try {
                // STEP 5: Relaunch Spotify
                reopenSpotify(context)
                Log.d(TAG, "Spotify relaunched. Waiting for player session to initialize...")

                // STEP 6: Coordinate intelligent resume
                resumePlaybackAfterRelaunch(context)

            } catch (e: Exception) {
                Log.e(TAG, "Error in relaunch step", e)
                try { wakeLock?.let { if (it.isHeld) it.release() } } catch (e: Exception) {}
                isSkipping.set(false)
            }
        }, 400L)
    }

    private fun resumePlaybackAfterRelaunch(context: Context) {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        val handler = Handler(Looper.getMainLooper())
        var attempts = 0

        val checkRunnable = object : Runnable {
            override fun run() {
                attempts++
                val controller = SpotifyNotificationListener.getSpotifyController(context)
                val currentTitle = controller?.metadata?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""

                if (controller != null && currentTitle.isNotBlank()) {
                    Log.i(TAG, "Spotify MediaController detected. Current title: '$currentTitle', Song before ad: '$songBeforeAd'")

                    // If Spotify still restored the finished song despite settle delay:
                    if (songBeforeAd.isNotBlank() && currentTitle.equals(songBeforeAd, ignoreCase = true)) {
                        Log.w(TAG, "Spotify still restored previous song ('$songBeforeAd'). Starting and advancing past it...")
                        try {
                            controller.transportControls.play()
                        } catch (e: Exception) {
                            dispatchMediaKeyEvent(context, audioManager, KeyEvent.KEYCODE_MEDIA_PLAY)
                        }

                        handler.postDelayed({
                            try {
                                controller.transportControls.skipToNext()
                                Log.i(TAG, "Dispatched skipToNext to move to next playlist song")
                            } catch (e: Exception) {
                                dispatchMediaKeyEvent(context, audioManager, KeyEvent.KEYCODE_MEDIA_NEXT)
                            }

                            handler.postDelayed({
                                finalizeResume(context, audioManager)
                            }, 500L)
                        }, 400L)
                    } else {
                        // Natural case: Spotify successfully advanced to the next song!
                        Log.i(TAG, "Spotify successfully advanced to new track ('$currentTitle')! Resuming playback (0 skips burned)...")
                        try {
                            controller.transportControls.play()
                        } catch (e: Exception) {
                            dispatchMediaKeyEvent(context, audioManager, KeyEvent.KEYCODE_MEDIA_PLAY)
                        }

                        handler.postDelayed({
                            finalizeResume(context, audioManager)
                        }, 500L)
                    }
                } else if (attempts < 14) {
                    // Poll every 250ms for up to ~3.5 seconds while Spotify cold-starts
                    handler.postDelayed(this, 250L)
                } else {
                    Log.w(TAG, "MediaController not ready after timeout. Executing PLAY key event fallback...")
                    dispatchMediaKeyEvent(context, audioManager, KeyEvent.KEYCODE_MEDIA_PLAY)
                    handler.postDelayed({
                        finalizeResume(context, audioManager)
                    }, 500L)
                }
            }
        }

        // Start checking 1200ms after relaunch
        handler.postDelayed(checkRunnable, 1200L)
    }

    private fun finalizeResume(context: Context, audioManager: AudioManager?) {
        val handler = Handler(Looper.getMainLooper())

        // STEP 7: Restore original volume
        if (autoMute && audioManager != null && savedVolume >= 0) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                audioManager.adjustStreamVolume(
                    AudioManager.STREAM_MUSIC,
                    AudioManager.ADJUST_UNMUTE,
                    0
                )
            }
            audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, savedVolume, 0)
            Log.d(TAG, "Audio unmuted to volume: $savedVolume")
        }

        // STEP 8: If the screen was off before the skip, turn it back off immediately
        if (wasScreenOff) {
            Log.i(TAG, "Restoring screen-off state via GLOBAL_ACTION_LOCK_SCREEN")
            handler.postDelayed({
                SpotifyAccessibilityService.lockScreen()
                try {
                    wakeLock?.let { if (it.isHeld) it.release() }
                } catch (e: Exception) {
                    Log.e(TAG, "Error releasing wakeLock", e)
                }
            }, 500L)
        }

        skipCount++
        val timestamp = System.currentTimeMillis()
        val title = if (currentAdTitle.isNotBlank()) currentAdTitle else "Spotify Advertisement"
        onAdSkippedListener?.invoke(title, 30, timestamp)
        Log.i(TAG, "Successfully completed skip loophole for: $title. Total skipped: $skipCount")
        isSkipping.set(false)
    }

    private fun killSpotifyFallback(context: Context) {
        try {
            val activityManager = context.getSystemService(Context.ACTIVITY_SERVICE) as? ActivityManager
            activityManager?.killBackgroundProcesses(SPOTIFY_PACKAGE)
        } catch (e: Exception) {
            Log.e(TAG, "Failed fallback killBackgroundProcesses", e)
        }
    }

    private fun reopenSpotify(context: Context) {
        try {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(SPOTIFY_PACKAGE)
            if (launchIntent != null) {
                launchIntent.addFlags(
                    Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED
                )
                context.startActivity(launchIntent)
            } else {
                Log.w(TAG, "Launch intent for $SPOTIFY_PACKAGE not found")
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to launch $SPOTIFY_PACKAGE", e)
        }
    }

    fun dispatchMediaKeyEvent(context: Context, audioManager: AudioManager?, keyCode: Int) {
        var dispatchedViaController = false
        try {
            val controller = SpotifyNotificationListener.getSpotifyController(context)
            if (controller != null) {
                when (keyCode) {
                    KeyEvent.KEYCODE_MEDIA_PLAY -> {
                        controller.transportControls.play()
                        dispatchedViaController = true
                    }
                    KeyEvent.KEYCODE_MEDIA_NEXT -> {
                        controller.transportControls.skipToNext()
                        dispatchedViaController = true
                    }
                    KeyEvent.KEYCODE_MEDIA_PAUSE -> {
                        controller.transportControls.pause()
                        dispatchedViaController = true
                    }
                }
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error dispatching through MediaController", e)
        }

        if (!dispatchedViaController) {
            val eventDown = KeyEvent(KeyEvent.ACTION_DOWN, keyCode)
            val eventUp = KeyEvent(KeyEvent.ACTION_UP, keyCode)
            try {
                audioManager?.dispatchMediaKeyEvent(eventDown)
                audioManager?.dispatchMediaKeyEvent(eventUp)
            } catch (e: Exception) {
                Log.e(TAG, "Failed AudioManager dispatchMediaKeyEvent", e)
            }
        }
    }

    fun isSpotifyInstalled(context: Context): Boolean {
        return try {
            context.packageManager.getPackageInfo(SPOTIFY_PACKAGE, 0)
            true
        } catch (e: Exception) {
            false
        }
    }
}
