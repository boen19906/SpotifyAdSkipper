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
        const val ACTION_REDOWNLOAD_ALL = "expo.modules.spotifyadskipper.REDOWNLOAD_ALL"
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.d(TAG, "Received broadcast action: $action")

        val appContext = context.applicationContext ?: context

        if (action == ACTION_REDOWNLOAD_ALL) {
            Log.i(TAG, "Received REDOWNLOAD_ALL broadcast action")
            SpotifyAudioDownloader.redownloadAll(appContext)
            return
        }

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

        if (SpotifyNotificationListener.isAdKeyword(track) || SpotifyNotificationListener.isAdKeyword(artist)) {
            return true
        }

        val lowerTrack = track.lowercase().trim()
        val lowerArtist = artist.lowercase().trim()

        if (lowerTrack == "spotify" && (lowerArtist.contains("ad") || SpotifyNotificationListener.isAdKeyword(lowerArtist) || lowerArtist == "spotify" || lowerArtist.isBlank())) {
            return true
        }

        if (lowerArtist == "spotify" && (lowerTrack.contains("ad") || SpotifyNotificationListener.isAdKeyword(lowerTrack) || lowerTrack.contains("sponsor"))) {
            return true
        }

        // Blank ID with typical ad duration (10s to 35s)
        if (id.isBlank() && (lowerTrack.contains("ad") || lowerTrack == "spotify") && (length in 10000..35000)) {
            return true
        }

        return false
    }
}
