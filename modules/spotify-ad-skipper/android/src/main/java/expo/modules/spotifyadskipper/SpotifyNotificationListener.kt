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

        var artist = text
        var album = subText
        if (text.contains("•")) {
            val parts = text.split("•")
            artist = parts[0].trim()
            if (album.isBlank() && parts.size > 1) {
                album = parts[1].trim()
            }
        }

        val isAd = isAdvertisementNotification(title, text)

        val controller = getSpotifyController(this)
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

        Log.d(TAG, "Spotify Notification: title='$title', artist='$artist', album='$album', isPlaying=$isPlaying, pos=$playbackPosition, dur=$duration")

        val appContext = applicationContext ?: this
        SpotifyAdSkipController.updateCurrentTrack(title, artist, isAd)
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

        if (isAd) {
            Log.i(TAG, "Ad detected via NotificationListener: '$title' - '$text'")
            SpotifyAdSkipController.handleAdDetected(
                this,
                if (title.isNotBlank()) title else "Spotify Advertisement",
                text,
                "NotificationListener"
            )
        }
    }

    private fun isAdvertisementNotification(title: String, text: String): Boolean {
        val lowerTitle = title.lowercase()
        val lowerText = text.lowercase()

        // Explicit advertisement title patterns
        if (lowerTitle == "advertisement" || 
            lowerTitle.startsWith("advertisement") || 
            lowerTitle.contains("advertisement •") || 
            lowerTitle.contains("ad •") || 
            lowerTitle.contains("ad  •")) {
            return true
        }

        // Spotify branded ads (must specifically say advertisement or sponsor, not just general words)
        if (lowerTitle == "spotify" && (
            lowerText.startsWith("advertisement") || 
            lowerText.contains("advertisement •") || 
            lowerText.contains("spotify sponsor") ||
            lowerText == "ad" ||
            lowerText.startsWith("ad ")
        )) {
            return true
        }

        if (lowerText.startsWith("advertisement •") || lowerText.contains("advertisement •") || lowerText.contains("spotify sponsor")) {
            return true
        }

        return false
    }
}
