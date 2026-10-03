package expo.modules.spotifyadskipper

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log

class SpotifyNotificationListener : NotificationListenerService() {
    companion object {
        private const val TAG = "SpotifyNotifListener"
        var instance: SpotifyNotificationListener? = null
        var isRunning: Boolean = false
            private set

        fun getSpotifyController(context: Context): MediaController? {
            try {
                val sessionManager = context.getSystemService(Context.MEDIA_SESSION_SERVICE) as? MediaSessionManager ?: return null
                val compName = ComponentName(context, SpotifyNotificationListener::class.java)
                val sessions = sessionManager.getActiveSessions(compName)
                for (session in sessions) {
                    if (session.packageName == SpotifyAdSkipController.SPOTIFY_PACKAGE) {
                        return session
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error querying active MediaSessions", e)
            }
            return null
        }

        fun isAdKeyword(str: String?): Boolean {
            if (str.isNullOrBlank()) return false
            val s = str.lowercase().trim()
            return s == "advertisement" ||
                   s.contains("advertisement") ||
                   s == "ad" ||
                   s.startsWith("ad •") ||
                   s.startsWith("ad  •") ||
                   s.endsWith("• ad") ||
                   s.contains("• ad •") ||
                   s.contains("spotify sponsor") ||
                   s.contains("sponsored") ||
                   s.contains("audio ad")
        }
    }

    private var registeredController: MediaController? = null
    private val mediaControllerCallback = object : MediaController.Callback() {
        override fun onMetadataChanged(metadata: MediaMetadata?) {
            super.onMetadataChanged(metadata)
            if (metadata == null) return
            val mTitle = metadata.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
            val mArtist = metadata.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: ""
            val mAlbum = metadata.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: ""
            if (isAdKeyword(mTitle) || isAdKeyword(mArtist) || isAdKeyword(mAlbum)) {
                Log.i(TAG, "Ad detected via real-time MediaController Callback: '$mTitle' by '$mArtist'")
                val appContext = applicationContext ?: this@SpotifyNotificationListener
                SpotifyAdSkipController.handleAdDetected(
                    appContext,
                    if (mTitle.isNotBlank()) mTitle else "Spotify Advertisement",
                    mArtist,
                    "MediaControllerCallback"
                )
            }
        }

        override fun onPlaybackStateChanged(state: PlaybackState?) {
            super.onPlaybackStateChanged(state)
            registeredController?.metadata?.let { meta ->
                val mTitle = meta.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
                val mArtist = meta.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: ""
                val mAlbum = meta.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: ""
                if (isAdKeyword(mTitle) || isAdKeyword(mArtist) || isAdKeyword(mAlbum)) {
                    Log.i(TAG, "Ad detected via PlaybackStateChanged: '$mTitle' by '$mArtist'")
                    val appContext = applicationContext ?: this@SpotifyNotificationListener
                    SpotifyAdSkipController.handleAdDetected(
                        appContext,
                        if (mTitle.isNotBlank()) mTitle else "Spotify Advertisement",
                        mArtist,
                        "MediaControllerPlaybackState"
                    )
                }
            }
        }
    }

    override fun onListenerConnected() {
        super.onListenerConnected()
        instance = this
        isRunning = true
        SpotifyAdSkipController.loadPreferences(applicationContext)
        Log.i(TAG, "SpotifyNotificationListener connected and listening")
    }

    override fun onListenerDisconnected() {
        super.onListenerDisconnected()
        try {
            registeredController?.unregisterCallback(mediaControllerCallback)
        } catch (e: Exception) {}
        registeredController = null
        instance = null
        isRunning = false
        Log.i(TAG, "SpotifyNotificationListener disconnected")
    }

    override fun onNotificationPosted(sbn: StatusBarNotification?) {
        if (sbn == null) return
        val packageName = sbn.packageName ?: return

        if (packageName != SpotifyAdSkipController.SPOTIFY_PACKAGE) {
            return
        }

        val notification = sbn.notification ?: return
        val extras: Bundle = notification.extras ?: return

        val title = extras.getCharSequence(Notification.EXTRA_TITLE)?.toString()?.trim() ?: ""
        val text = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString()?.trim() ?: ""
        val subText = extras.getCharSequence(Notification.EXTRA_SUB_TEXT)?.toString()?.trim() ?: ""
        val bigText = extras.getCharSequence(Notification.EXTRA_BIG_TEXT)?.toString()?.trim() ?: ""
        val ticker = notification.tickerText?.toString()?.trim() ?: ""

        var artist = text
        var album = subText
        if (text.contains("•")) {
            val parts = text.split("•")
            artist = parts[0].trim()
            if (album.isBlank() && parts.size > 1) {
                album = parts[1].trim()
            }
        }

        val controller = getSpotifyController(this)
        if (controller != null && controller != registeredController) {
            try {
                registeredController?.unregisterCallback(mediaControllerCallback)
            } catch (e: Exception) {}
            registeredController = controller
            try {
                controller.registerCallback(mediaControllerCallback)
            } catch (e: Exception) {
                Log.e(TAG, "Error registering MediaController callback", e)
            }
        }

        val metaTitle = controller?.metadata?.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
        val metaArtist = controller?.metadata?.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: ""
        val metaAlbum = controller?.metadata?.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: ""

        val isAd = isAdvertisementNotification(title, text, subText, bigText, ticker, metaTitle, metaArtist, metaAlbum)

        val playbackState = controller?.playbackState
        var isPlaying = playbackState?.state == PlaybackState.STATE_PLAYING
        if (playbackState == null && notification.actions != null) {
            for (action in notification.actions) {
                val actionTitle = action.title?.toString()?.lowercase() ?: ""
                if (actionTitle.contains("pause")) {
                    isPlaying = true
                    break
                }
            }
        }

        val playbackPosition = (playbackState?.position ?: 0L).toInt()
        val duration = (controller?.metadata?.getLong(MediaMetadata.METADATA_KEY_DURATION) ?: 0L).toInt()

        Log.d(TAG, "Spotify Notification: title='$title', artist='$artist', album='$album', isPlaying=$isPlaying, isAd=$isAd, pos=$playbackPosition, dur=$duration")

        val appContext = applicationContext ?: this
        SpotifyAdSkipController.updateCurrentTrack(appContext, title, artist, isAd)
        SpotifyTrackHistoryManager.handlePlaybackEvent(
            appContext,
            title,
            artist,
            album,
            "",
            duration,
            isPlaying,
            isAd
        )

        if (title.isNotBlank()) {
            Handler(Looper.getMainLooper()).post {
                SpotifyAdSkipController.onMetadataChangedListener?.invoke(
                    title,
                    artist,
                    album,
                    isPlaying,
                    isAd,
                    "",
                    duration,
                    playbackPosition
                )
            }
        }

        // TRIGGER SKIP IMMEDIATELY NO MATTER WHAT IF AN AD IS PLAYING OR VISIBLE
        if (isAd) {
            val adTitle = if (title.isNotBlank() && !title.equals("Spotify", ignoreCase = true)) {
                title
            } else if (metaTitle.isNotBlank() && !metaTitle.equals("Spotify", ignoreCase = true)) {
                metaTitle
            } else {
                "Spotify Advertisement"
            }
            Log.i(TAG, "Ad detected via NotificationListener: '$adTitle' ('$text') - TRIGGERING IMMEDIATE SKIP")
            SpotifyAdSkipController.handleAdDetected(
                appContext,
                adTitle,
                artist,
                "NotificationListener"
            )
        }
    }

    private fun isAdvertisementNotification(
        title: String,
        text: String,
        subText: String,
        bigText: String,
        ticker: String,
        metaTitle: String,
        metaArtist: String,
        metaAlbum: String
    ): Boolean {
        if (isAdKeyword(title) || isAdKeyword(text) || isAdKeyword(subText) ||
            isAdKeyword(bigText) || isAdKeyword(ticker) || isAdKeyword(metaTitle) ||
            isAdKeyword(metaArtist) || isAdKeyword(metaAlbum)) {
            return true
        }

        val lowerTitle = title.lowercase().trim()
        val lowerText = text.lowercase().trim()

        if (lowerTitle == "spotify" && (lowerText.contains("ad") || isAdKeyword(lowerText) || lowerText == "spotify" || lowerText.isBlank())) {
            return true
        }

        if (lowerText == "spotify" && (lowerTitle.contains("ad") || isAdKeyword(lowerTitle))) {
            return true
        }

        return false
    }
}
