package expo.modules.spotifyadskipper

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.media.MediaMetadata
import android.os.Handler
import android.os.Looper
import android.util.Log

class SpotifyBroadcastReceiver : BroadcastReceiver() {
    companion object {
        private const val TAG = "SpotifyBrdcstRcvr"
        const val ACTION_METADATA_CHANGED = "com.spotify.music.metadatachanged"
        const val ACTION_PLAYBACK_STATE_CHANGED = "com.spotify.music.playbackstatechanged"
        const val ACTION_QUEUE_CHANGED = "com.spotify.music.queuechanged"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "Received broadcast action: $action")

        var id = intent.getStringExtra("id") ?: ""
        var artist = intent.getStringExtra("artist") ?: ""
        var album = intent.getStringExtra("album") ?: ""
        var track = intent.getStringExtra("track") ?: ""
        var length = intent.getIntExtra("length", 0)
        val isPlaying = intent.getBooleanExtra("playing", false)
        val playbackPosition = intent.getIntExtra("playbackPosition", 0)

        // If intent has blank track/id (common in playbackstatechanged or queuechanged), check active MediaController
        if (track.isBlank() && id.isBlank()) {
            val controller = SpotifyNotificationListener.getSpotifyController(context)
            val meta = controller?.metadata
            if (meta != null) {
                track = meta.getString(MediaMetadata.METADATA_KEY_TITLE) ?: ""
                artist = meta.getString(MediaMetadata.METADATA_KEY_ARTIST) ?: ""
                album = meta.getString(MediaMetadata.METADATA_KEY_ALBUM) ?: ""
                length = (meta.getLong(MediaMetadata.METADATA_KEY_DURATION) ?: 0L).toInt()
            }
        }

        val isAd = isAdvertisement(id, track, artist, length)
        val appContext = context.applicationContext ?: context

        SpotifyAdSkipController.updateCurrentTrack(appContext, track, artist, isAd)
        SpotifyTrackHistoryManager.handlePlaybackEvent(
            appContext,
            track,
            artist,
            album,
            id,
            length,
            isPlaying,
            isAd
        )

        Log.d(TAG, "Track Info -> id='$id', track='$track', artist='$artist', isPlaying=$isPlaying, isAd=$isAd, pos=$playbackPosition")

        Handler(Looper.getMainLooper()).post {
            SpotifyAdSkipController.onMetadataChangedListener?.invoke(
                track,
                artist,
                album,
                isPlaying,
                isAd,
                id,
                length,
                playbackPosition
            )
        }

        // TRIGGER SKIP IMMEDIATELY NO MATTER WHAT IF AN AD IS DETECTED
        if (isAd) {
            val adTitle = if (track.isNotBlank() && !track.equals("Spotify", ignoreCase = true)) track else "Spotify Advertisement"
            Log.i(TAG, "Ad detected via BroadcastReceiver: '$adTitle' by '$artist' - TRIGGERING SKIP IMMEDIATELY")
            SpotifyAdSkipController.handleAdDetected(appContext, adTitle, artist, "BroadcastReceiver")
        }
    }

    private fun isAdvertisement(id: String, track: String, artist: String, length: Int): Boolean {
        // Spotify ad URIs typically start with "spotify:ad:" or contain ":ad:"
        if (id.startsWith("spotify:ad:", ignoreCase = true) || id.contains(":ad:", ignoreCase = true) || id.contains("advertisement", ignoreCase = true)) {
            return true
        }

        fun isAdWord(s: String): Boolean {
            val lower = s.lowercase().trim()
            if (lower.isEmpty()) return false
            return lower == "advertisement" ||
                   lower.contains("advertisement") ||
                   lower == "ad" ||
                   lower.startsWith("ad •") ||
                   lower.startsWith("ad  •") ||
                   lower.endsWith("• ad") ||
                   lower.contains("• ad •") ||
                   lower.contains("spotify sponsor") ||
                   lower.contains("sponsored") ||
                   lower.contains("audio ad")
        }

        if (isAdWord(track) || isAdWord(artist)) {
            return true
        }

        val lowerTrack = track.lowercase().trim()
        val lowerArtist = artist.lowercase().trim()

        if (lowerTrack == "spotify" && (lowerArtist.contains("ad") || isAdWord(lowerArtist) || lowerArtist == "spotify" || lowerArtist.isBlank())) {
            return true
        }

        if (lowerArtist == "spotify" && (lowerTrack.contains("ad") || isAdWord(lowerTrack) || lowerTrack.contains("sponsor"))) {
            return true
        }

        // Blank ID with typical ad duration (10s to 35s)
        if (id.isBlank() && (lowerTrack.contains("ad") || lowerTrack == "spotify") && (length in 10000..35000)) {
            return true
        }

        return false
    }
}
