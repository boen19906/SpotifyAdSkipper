package expo.modules.spotifyadskipper

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
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

        val id = intent.getStringExtra("id") ?: ""
        val artist = intent.getStringExtra("artist") ?: ""
        val album = intent.getStringExtra("album") ?: ""
        val track = intent.getStringExtra("track") ?: ""
        val length = intent.getIntExtra("length", 0)
        val isPlaying = intent.getBooleanExtra("playing", false)
        val playbackPosition = intent.getIntExtra("playbackPosition", 0)

        val isAd = isAdvertisement(id, track, artist, length)
        val appContext = context.applicationContext ?: context

        SpotifyAdSkipController.updateCurrentTrack(track, artist, isAd)
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

        if (isAd && isPlaying) {
            val adTitle = if (track.isNotBlank()) track else "Spotify Advertisement"
            SpotifyAdSkipController.handleAdDetected(context, adTitle, artist, "BroadcastReceiver")
        }
    }

    private fun isAdvertisement(id: String, track: String, artist: String, length: Int): Boolean {
        // Spotify ad URIs typically start with "spotify:ad:"
        if (id.startsWith("spotify:ad:", ignoreCase = true) || id.contains("advertisement", ignoreCase = true)) {
            return true
        }

        // Title explicitly labeled as advertisement
        if (track.equals("Advertisement", ignoreCase = true) ||
            track.startsWith("Advertisement •", ignoreCase = true) ||
            track.contains("Spotify Sponsor", ignoreCase = true)) {
            return true
        }

        // Ad format where track is Advertisement and artist is Spotify
        if (track.equals("Advertisement", ignoreCase = true) && artist.equals("Spotify", ignoreCase = true)) {
            return true
        }

        // Blank ID with typical ad duration
        if (id.isBlank() && track.contains("Advertisement", ignoreCase = true) && (length in 10000..35000)) {
            return true
        }

        return false
    }
}
