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
    var adSettleDelayMs: Long = 300L
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

    private var isMutedBySkipper: Boolean = false
    private var savedVolume: Int = -1

    fun muteAudioImmediately(context: Context) {
        try {
            if (!autoMute) return
            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return

            // Capture the user's volume only if not already muted
            if (!isMutedBySkipper) {
                val currentVol = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
                if (currentVol > 0) {
                    savedVolume = currentVol
                    Log.d(TAG, "Captured playback volume before mute: $savedVolume")
                }
            }

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                audioManager.adjustStreamVolume(
                    AudioManager.STREAM_MUSIC,
                    AudioManager.ADJUST_MUTE,
                    0
                )
            } else {
                audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, 0, 0)
            }
            isMutedBySkipper = true
            Log.d(TAG, "Audio muted immediately upon ad detection")
        } catch (e: Exception) {
            Log.e(TAG, "Failed to mute audio immediately", e)
        }
    }

    private var adWatcherRunnable: Runnable? = null
    private val watcherHandler = Handler(Looper.getMainLooper())

    fun isCurrentMediaAnAd(context: Context): Boolean {
        try {
            val controller = SpotifyNotificationListener.getSpotifyController(context)
            val meta = controller?.metadata ?: return false
            val title = meta.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
            val artist = meta.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: ""
            val album = meta.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: ""
            return SpotifyNotificationListener.isAdKeyword(title) ||
                   SpotifyNotificationListener.isAdKeyword(artist) ||
                   SpotifyNotificationListener.isAdKeyword(album)
        } catch (e: Exception) {
            return false
        }
    }

    fun startContinuousAdWatcher(context: Context) {
        adWatcherRunnable?.let { watcherHandler.removeCallbacks(it) }
        var watcherAttempts = 0
        val maxWatcherAttempts = 120 // Monitor for up to 60 seconds (120 * 500ms)

        adWatcherRunnable = object : Runnable {
            override fun run() {
                watcherAttempts++
                val controller = SpotifyNotificationListener.getSpotifyController(context)
                val meta = controller?.metadata
                val title = meta?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
                val artist = meta?.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: ""
                val album = meta?.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: ""

                val isAdNow = SpotifyNotificationListener.isAdKeyword(title) ||
                              SpotifyNotificationListener.isAdKeyword(artist) ||
                              SpotifyNotificationListener.isAdKeyword(album)

                if (isAdNow) {
                    // Ad is still actively running: guarantee audio is muted
                    muteAudioImmediately(context)
                    if (watcherAttempts < maxWatcherAttempts) {
                        watcherHandler.postDelayed(this, 500L)
                    } else {
                        Log.w(TAG, "Ad watcher reached 60s timeout while still on ad. Resetting skip flag.")
                        finishSkipAndRestoreState(context)
                    }
                } else if (title.isNotBlank() && !title.equals("Spotify", ignoreCase = true)) {
                    // A real non-ad song has arrived!
                    Log.i(TAG, "Ad finished! Real song started: '$title' by '$artist'. Restoring audio...")
                    ensureAudioUnmuted(context)
                    skipCount++
                    val timestamp = System.currentTimeMillis()
                    val adName = if (currentAdTitle.isNotBlank()) currentAdTitle else "Spotify Advertisement"
                    onAdSkippedListener?.invoke(adName, 30, timestamp)
                    finishSkipAndRestoreState(context)
                } else if (watcherAttempts < maxWatcherAttempts) {
                    // In-between tracks / buffering: stay muted and check again
                    muteAudioImmediately(context)
                    watcherHandler.postDelayed(this, 500L)
                } else {
                    finishSkipAndRestoreState(context)
                }
            }
        }
        watcherHandler.postDelayed(adWatcherRunnable!!, 300L)
    }

    fun ensureAudioUnmuted(context: Context) {
        try {
            if (!autoMute) return

            // CRITICAL GUARD: NEVER unmute if Spotify is currently playing an ad!
            if (isCurrentMediaAnAd(context)) {
                Log.w(TAG, "ensureAudioUnmuted: Active media is currently an ad. Keeping muted!")
                return
            }

            val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return

            val isMuted = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                audioManager.isStreamMute(AudioManager.STREAM_MUSIC)
            } else {
                isMutedBySkipper
            }

            // Only unmute if our skipper actually muted it or the stream is currently reported muted
            if (isMuted || isMutedBySkipper) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    audioManager.adjustStreamVolume(
                        AudioManager.STREAM_MUSIC,
                        AudioManager.ADJUST_UNMUTE,
                        0
                    )
                }

                // Only if stream volume remained at 0 and we saved the user's previous volume, restore it
                val current = audioManager.getStreamVolume(AudioManager.STREAM_MUSIC)
                if (current == 0 && savedVolume > 0) {
                    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, savedVolume, 0)
                    Log.i(TAG, "Restored volume to user's setting: $savedVolume")
                }

                Log.i(TAG, "Safety: Unmuted music stream because normal song is active")
                isMutedBySkipper = false
                savedVolume = -1
            }
        } catch (e: Exception) {
            Log.w(TAG, "Error in ensureAudioUnmuted", e)
        }
    }

    var isAutomatingForceStop: Boolean = false
    private val isSkipping = AtomicBoolean(false)
    val isCurrentlySkipping: Boolean get() = isSkipping.get()
    @Volatile
    var packageBeforeSkip: String? = null
    private var lastSkipTimestamp: Long = 0L
    private var currentAdTitle: String = ""
    private var wakeLock: PowerManager.WakeLock? = null
    private var wasScreenOff: Boolean = false

    var lastPlayedSongTitle: String = ""
    var lastPlayedSongArtist: String = ""
    var songBeforeAd: String = ""

    var onAdDetectedListener: ((title: String, artist: String) -> Unit)? = null
    var onAdSkippedListener: ((title: String, durationSavedSeconds: Int, timestamp: Long) -> Unit)? = null
    var onMetadataChangedListener: ((track: String, artist: String, album: String, isPlaying: Boolean, isAd: Boolean, trackId: String, durationMs: Int, playbackPositionMs: Int) -> Unit)? = null

    fun updateCurrentTrack(context: Context, track: String, artist: String, isAd: Boolean) {
        val cleanTrack = track.trim()
        val cleanArtist = artist.trim()
        if (!isAd && cleanTrack.isNotBlank() &&
            !cleanTrack.equals("Spotify", ignoreCase = true) &&
            !cleanTrack.contains("Advertisement", ignoreCase = true)) {
            lastPlayedSongTitle = cleanTrack
            lastPlayedSongArtist = cleanArtist
            Log.d(TAG, "Updated current active track: '$cleanTrack' by '$cleanArtist'")

            // If a real song is now playing and skipper is not actively running a skip sequence,
            // verify audio is not left muted!
            if (!isSkipping.get()) {
                ensureAudioUnmuted(context)
            }
        }
    }

    fun handleAdDetected(context: Context, trackTitle: String, artist: String, source: String) {
        if (!isEnabled) {
            Log.d(TAG, "Ad detected ($trackTitle by $artist) from $source but skipper is disabled.")
            return
        }

        // SILENCE AD AUDIO IMMEDIATELY - ZERO DELAY
        muteAudioImmediately(context)

        val now = SystemClock.elapsedRealtime()
        // Responsive 1.5s debounce buffer (allows back-to-back ads to be skipped)
        if (now - lastSkipTimestamp < 1500L) {
            Log.d(TAG, "Ad detected within 1.5s debounce period, ignoring duplicate event: $trackTitle")
            return
        }

        // If a previous skip was stuck for > 5 seconds, clear lock to guarantee we never miss an ad
        if (isSkipping.get() && (now - lastSkipTimestamp > 5000L)) {
            Log.w(TAG, "Skip flag held for >5s, resetting to ensure ad is skipped")
            isSkipping.set(false)
        }

        if (!isSkipping.compareAndSet(false, true)) {
            Log.d(TAG, "Skip sequence already running, ignoring: $trackTitle")
            return
        }

        lastSkipTimestamp = now
        currentAdTitle = trackTitle

        val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
        wasScreenOff = powerManager != null && !powerManager.isInteractive
        if (!wasScreenOff) {
            packageBeforeSkip = SpotifyAccessibilityService.getActiveForegroundPackage(context)
            Log.i(TAG, "Screen is ON during ad detection. Captured foreground package to restore: '$packageBeforeSkip'")
        } else {
            packageBeforeSkip = null
            Log.i(TAG, "Screen is OFF during ad detection. Will restore lockscreen state upon completion.")
        }

        // Ensure we capture the song that played immediately before the ad
        if (lastPlayedSongTitle.isBlank()) {
            val controller = SpotifyNotificationListener.getSpotifyController(context)
            val metaTitle = controller?.metadata?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
            if (metaTitle.isNotBlank() && !metaTitle.contains("Advertisement", ignoreCase = true) && !metaTitle.equals("Spotify", ignoreCase = true)) {
                lastPlayedSongTitle = metaTitle
            }
        }
        songBeforeAd = lastPlayedSongTitle
        Log.i(TAG, "Executing Spotify Ad Skip loophole IMMEDIATELY for '$trackTitle' via $source. (Song before ad: '$songBeforeAd')")

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
            // STEP 1: Acquire a WakeLock for the duration of the skip so the display cannot
            // time out mid-sequence (which would abort the previous-app restore step).
            try {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                wakeLock?.let { if (it.isHeld) it.release() }
                @Suppress("DEPRECATION")
                wakeLock = powerManager?.newWakeLock(
                    PowerManager.SCREEN_BRIGHT_WAKE_LOCK or PowerManager.ACQUIRE_CAUSES_WAKEUP or PowerManager.ON_AFTER_RELEASE,
                    "spotifyadskip:wake_for_skip"
                )
                wakeLock?.acquire(15000L)
                if (wasScreenOff) {
                    Log.i(TAG, "Screen is off/sleeping. WakeLock will wake display for skip automation.")
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to acquire screen wakeup WakeLock", e)
            }

            // STEP 2: Ensure audio is muted immediately
            muteAudioImmediately(context)

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
                        Log.w(TAG, "AccessibilityService is not enabled! Muting ad and maintaining silent watch until real song plays.")
                        muteAudioImmediately(context)
                        startContinuousAdWatcher(context)
                    }
                } catch (e: Exception) {
                    Log.e(TAG, "Error in delayed force stop trigger", e)
                    finishSkipAndRestoreState(context)
                }
            }, adSettleDelayMs)

        } catch (e: Exception) {
            Log.e(TAG, "Error executing ad skip sequence", e)
            finishSkipAndRestoreState(context)
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
                finishSkipAndRestoreState(context)
            }
        }, 400L)
    }

    private fun resumePlaybackAfterRelaunch(context: Context) {
        val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        val handler = Handler(Looper.getMainLooper())
        var attempts = 0
        val maxAttempts = 16

        val checkRunnable = object : Runnable {
            override fun run() {
                attempts++
                val controller = SpotifyNotificationListener.getSpotifyController(context)
                val meta = controller?.metadata
                val currentTitle = meta?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
                val currentArtist = meta?.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: ""
                val currentAlbum = meta?.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: ""

                val isAdNow = SpotifyNotificationListener.isAdKeyword(currentTitle) ||
                              SpotifyNotificationListener.isAdKeyword(currentArtist) ||
                              SpotifyNotificationListener.isAdKeyword(currentAlbum)

                if (controller != null && currentTitle.isNotBlank()) {
                    Log.i(TAG, "Spotify MediaController detected. Current: '$currentTitle' by '$currentArtist', Song before ad: '$songBeforeAd', isAd=$isAdNow")

                    if (isAdNow) {
                        // STILL AN AD! KEEP MUTED! DO NOT UNMUTE!
                        Log.w(TAG, "Relaunched Spotify but it is STILL playing an ad ('$currentTitle'). Audio remains muted.")
                        muteAudioImmediately(context)

                        if (attempts < maxAttempts) {
                            handler.postDelayed(this, 350L)
                            return
                        } else {
                            startContinuousAdWatcher(context)
                            return
                        }
                    }

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
                        return
                    }

                    // Natural case: Spotify successfully advanced to the next song!
                    Log.i(TAG, "Spotify successfully advanced to new non-ad track ('$currentTitle')! Resuming playback...")
                    try {
                        controller.transportControls.play()
                    } catch (e: Exception) {
                        dispatchMediaKeyEvent(context, audioManager, KeyEvent.KEYCODE_MEDIA_PLAY)
                    }

                    handler.postDelayed({
                        finalizeResume(context, audioManager)
                    }, 500L)
                    return
                }

                if (attempts < maxAttempts) {
                    handler.postDelayed(this, 250L)
                } else {
                    Log.w(TAG, "MediaController not ready after timeout. Checking before unmuting...")
                    if (!isCurrentMediaAnAd(context)) {
                        dispatchMediaKeyEvent(context, audioManager, KeyEvent.KEYCODE_MEDIA_PLAY)
                        handler.postDelayed({
                            finalizeResume(context, audioManager)
                        }, 500L)
                    } else {
                        Log.w(TAG, "Timeout but media is still an ad. Audio remains muted.")
                        startContinuousAdWatcher(context)
                    }
                }
            }
        }

        // Start checking 800ms after relaunch
        handler.postDelayed(checkRunnable, 800L)
    }

    private fun finalizeResume(context: Context, audioManager: AudioManager?) {
        val handler = Handler(Looper.getMainLooper())

        // CRITICAL GUARD: Verify that active media is NOT an advertisement before unmuting!
        if (isCurrentMediaAnAd(context)) {
            Log.w(TAG, "finalizeResume called but media is still an ad! REFUSING to unmute.")
            muteAudioImmediately(context)
            startContinuousAdWatcher(context)
            return
        }

        // STEP 7: Restore original volume safely (without overriding user's volume level)
        ensureAudioUnmuted(context)

        skipCount++
        val timestamp = System.currentTimeMillis()
        val title = if (currentAdTitle.isNotBlank()) currentAdTitle else "Spotify Advertisement"
        onAdSkippedListener?.invoke(title, 30, timestamp)
        Log.i(TAG, "Successfully completed skip loophole for: $title. Total skipped: $skipCount")

        // STEP 8: Restore screen-off or previous app/window state
        finishSkipAndRestoreState(context)
    }

    fun finishSkipAndRestoreState(context: Context) {
        val handler = Handler(Looper.getMainLooper())

        // Guard against double-invocation (finalizeResume and the ad watcher can race);
        // a second call with cleared state would otherwise navigate to the Home screen.
        if (!isSkipping.getAndSet(false)) {
            Log.d(TAG, "finishSkipAndRestoreState called with no active skip sequence; ignoring")
            return
        }

        if (wasScreenOff) {
            wasScreenOff = false
            packageBeforeSkip = null
            Log.i(TAG, "Restoring screen-off state via GLOBAL_ACTION_LOCK_SCREEN")
            handler.postDelayed({
                SpotifyAccessibilityService.lockScreen()
                releaseWakeLock()
            }, 500L)
        } else {
            // Screen was ON at detection: always return to the app the user was on before
            // the skip, even if the display went to sleep mid-sequence (the restored app
            // will surface on unlock).
            val targetToRestore = packageBeforeSkip
            packageBeforeSkip = null
            Log.i(TAG, "Screen was on during skip. Restoring previous app/window: '$targetToRestore'")
            handler.postDelayed({
                SpotifyAccessibilityService.restoreAppOrWindow(context, targetToRestore)
            }, 300L)
            handler.postDelayed({ releaseWakeLock() }, 800L)
        }
    }

    private fun releaseWakeLock() {
        try {
            wakeLock?.let { if (it.isHeld) it.release() }
        } catch (e: Exception) {
            Log.e(TAG, "Error releasing wakeLock", e)
        }
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
                    Intent.FLAG_ACTIVITY_RESET_TASK_IF_NEEDED or
                    Intent.FLAG_ACTIVITY_NO_ANIMATION
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
