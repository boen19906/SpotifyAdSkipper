package expo.modules.spotifyadskipper

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File

object SpotifyTrackHistoryManager {
    private const val TAG = "TrackHistoryManager"
    private const val FILE_NAME = "listened_tracks.json"
    private const val MIN_LISTEN_THRESHOLD_MS = 20_000L // 20 seconds threshold

    private var currentTitle: String = ""
    private var currentArtist: String = ""
    private var currentAlbum: String = ""
    private var currentTrackId: String = ""
    private var currentDurationMs: Int = 0

    private var playbackResumeTimestamp: Long = 0L
    private var accumulatedPlayTimeMs: Long = 0L
    private var isCurrentlyPlaying: Boolean = false
    private var hasCommittedCurrentTrack: Boolean = false

    private val handler = Handler(Looper.getMainLooper())
    private var pendingCommitRunnable: Runnable? = null

    var onTrackCommittedListener: ((title: String, artist: String, album: String, trackId: String, durationMs: Int) -> Unit)? = null

    private fun normalizeArtist(artist: String): String {
        val trimmed = artist.trim()
        return if (trimmed.contains("•")) {
            trimmed.split("•")[0].trim()
        } else {
            trimmed
        }
    }

    @Synchronized
    fun handlePlaybackEvent(
        context: Context,
        track: String,
        artist: String,
        album: String,
        trackId: String,
        durationMs: Int,
        isPlaying: Boolean,
        isAd: Boolean
    ) {
        val appContext = context.applicationContext ?: context
        val cleanTrack = track.trim()
        val cleanArtist = normalizeArtist(artist)
        val cleanAlbum = album.trim()
        val cleanTrackId = trackId.trim()

        Log.d(TAG, "handlePlaybackEvent: '$cleanTrack' by '$cleanArtist', isPlaying=$isPlaying, isAd=$isAd, duration=$durationMs")

        // Filter out ads and empty metadata
        if (isAd || cleanTrack.isBlank() || cleanTrack.equals("Advertisement", ignoreCase = true)) {
            cancelPendingCommit()
            commitPreviousIfEligible(appContext)
            resetCurrentTrack()
            return
        }

        val isSameTrack = (currentTrackId.isNotBlank() && cleanTrackId.isNotBlank() && currentTrackId.equals(cleanTrackId, ignoreCase = true)) ||
                (currentTitle.equals(cleanTrack, ignoreCase = true) &&
                        (currentArtist.equals(cleanArtist, ignoreCase = true) ||
                         cleanArtist.startsWith(currentArtist, ignoreCase = true) ||
                         currentArtist.startsWith(cleanArtist, ignoreCase = true)))

        val now = SystemClock.elapsedRealtime()

        if (isSameTrack && currentTitle.isNotBlank()) {
            if (isPlaying && !isCurrentlyPlaying) {
                // Resume playback
                isCurrentlyPlaying = true
                playbackResumeTimestamp = now
                scheduleCommitIfNeeded(appContext)
            } else if (!isPlaying && isCurrentlyPlaying) {
                // Pause playback: accumulate elapsed active time
                accumulatedPlayTimeMs += (now - playbackResumeTimestamp)
                isCurrentlyPlaying = false
                cancelPendingCommit()
            }
        } else {
            // New track started: check if previous track had satisfied listen threshold before switching
            commitPreviousIfEligible(appContext)
            cancelPendingCommit()

            currentTitle = cleanTrack
            currentArtist = cleanArtist
            currentAlbum = cleanAlbum
            currentTrackId = cleanTrackId
            currentDurationMs = durationMs
            accumulatedPlayTimeMs = 0L
            playbackResumeTimestamp = now
            isCurrentlyPlaying = isPlaying
            hasCommittedCurrentTrack = false

            if (isPlaying) {
                scheduleCommitIfNeeded(appContext)
            }
        }
    }

    private fun cancelPendingCommit() {
        pendingCommitRunnable?.let {
            handler.removeCallbacks(it)
            pendingCommitRunnable = null
        }
    }

    private fun scheduleCommitIfNeeded(context: Context) {
        val appContext = context.applicationContext ?: context
        if (hasCommittedCurrentTrack) return

        val remainingMs = (MIN_LISTEN_THRESHOLD_MS - accumulatedPlayTimeMs).coerceAtLeast(0L)
        cancelPendingCommit()

        val runnable = Runnable {
            synchronized(this) {
                if (isCurrentlyPlaying && !hasCommittedCurrentTrack) {
                    val now = SystemClock.elapsedRealtime()
                    val total = accumulatedPlayTimeMs + (now - playbackResumeTimestamp)
                    if (total >= MIN_LISTEN_THRESHOLD_MS) {
                        commitTrack(appContext, currentTitle, currentArtist, currentAlbum, currentTrackId, currentDurationMs, total)
                        hasCommittedCurrentTrack = true
                    }
                }
            }
        }
        pendingCommitRunnable = runnable
        handler.postDelayed(runnable, remainingMs)
        Log.d(TAG, "Scheduled native commit for '$currentTitle' in ${remainingMs}ms")
    }

    private fun commitPreviousIfEligible(context: Context) {
        val appContext = context.applicationContext ?: context
        if (currentTitle.isNotBlank() && !hasCommittedCurrentTrack) {
            val total = if (isCurrentlyPlaying) {
                accumulatedPlayTimeMs + (SystemClock.elapsedRealtime() - playbackResumeTimestamp)
            } else {
                accumulatedPlayTimeMs
            }

            if (total >= MIN_LISTEN_THRESHOLD_MS) {
                commitTrack(appContext, currentTitle, currentArtist, currentAlbum, currentTrackId, currentDurationMs, total)
                hasCommittedCurrentTrack = true
            }
        }
    }

    private fun resetCurrentTrack() {
        currentTitle = ""
        currentArtist = ""
        currentAlbum = ""
        currentTrackId = ""
        currentDurationMs = 0
        accumulatedPlayTimeMs = 0L
        isCurrentlyPlaying = false
        hasCommittedCurrentTrack = false
    }

    @Synchronized
    fun saveTrack(context: Context, trackData: Map<String, Any>): Boolean {
        val appContext = context.applicationContext ?: context
        return try {
            val title = (trackData["title"] as? String)?.trim() ?: return false
            if (title.isBlank()) return false
            val artist = (trackData["artist"] as? String)?.trim() ?: ""
            val album = (trackData["album"] as? String)?.trim() ?: ""
            val trackId = (trackData["trackId"] as? String)?.trim() ?: ""
            val durationMs = (trackData["durationMs"] as? Number)?.toInt() ?: 0
            val durationSpentMs = (trackData["totalDurationListenedMs"] as? Number)?.toLong() ?: 30000L
            commitTrack(appContext, title, artist, album, trackId, durationMs, durationSpentMs)
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error in manual saveTrack", e)
            false
        }
    }

    @Synchronized
    private fun commitTrack(
        context: Context,
        title: String,
        artist: String,
        album: String,
        trackId: String,
        durationMs: Int,
        durationSpentMs: Long
    ) {
        val appContext = context.applicationContext ?: context
        try {
            if (!appContext.filesDir.exists()) {
                appContext.filesDir.mkdirs()
            }
            val file = File(appContext.filesDir, FILE_NAME)
            val jsonArray = if (file.exists()) {
                val content = file.readText()
                if (content.isNotBlank()) JSONArray(content) else JSONArray()
            } else {
                JSONArray()
            }

            val now = System.currentTimeMillis()
            var existingIndex = -1
            val cleanTitle = title.trim()
            val cleanArtist = normalizeArtist(artist)
            val cleanTrackId = trackId.trim()

            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.getJSONObject(i)
                val itemTrackId = item.optString("trackId", "").trim()
                val itemTitle = item.optString("title", "").trim()
                val itemArtist = normalizeArtist(item.optString("artist", ""))

                val isMatch = (cleanTrackId.isNotBlank() && itemTrackId.isNotBlank() && cleanTrackId.equals(itemTrackId, ignoreCase = true)) ||
                        (cleanTitle.equals(itemTitle, ignoreCase = true) &&
                                (cleanArtist.equals(itemArtist, ignoreCase = true) ||
                                 cleanArtist.startsWith(itemArtist, ignoreCase = true) ||
                                 itemArtist.startsWith(cleanArtist, ignoreCase = true)))

                if (isMatch) {
                    existingIndex = i
                    break
                }
            }

            val targetObj: JSONObject
            if (existingIndex >= 0) {
                targetObj = jsonArray.getJSONObject(existingIndex)
                val prevPlayCount = targetObj.optInt("listenCount", 1)
                val prevTotalDuration = targetObj.optLong("totalDurationListenedMs", 30000L)
                val prevLastListenedAt = targetObj.optLong("lastListenedAt", 0L)

                // If committed within 60s of previous commit for this same song, do not increment listenCount!
                val isRecentDuplicate = (now - prevLastListenedAt) < 60_000L
                val newPlayCount = if (isRecentDuplicate) prevPlayCount else prevPlayCount + 1

                targetObj.put("listenCount", newPlayCount)
                targetObj.put("lastListenedAt", now)
                targetObj.put("totalDurationListenedMs", if (isRecentDuplicate) Math.max(prevTotalDuration, durationSpentMs) else prevTotalDuration + durationSpentMs)
                if (album.isNotBlank()) targetObj.put("album", album)
                if (durationMs > 0) targetObj.put("durationMs", durationMs)
                if (cleanTrackId.isNotBlank()) targetObj.put("trackId", cleanTrackId)

                // Move to front
                jsonArray.remove(existingIndex)
            } else {
                targetObj = JSONObject().apply {
                    put("id", "${now}_${(1000..9999).random()}")
                    put("trackId", cleanTrackId)
                    put("title", cleanTitle)
                    put("artist", cleanArtist)
                    put("album", album)
                    put("durationMs", durationMs)
                    put("firstListenedAt", now)
                    put("lastListenedAt", now)
                    put("listenCount", 1)
                    put("totalDurationListenedMs", durationSpentMs)
                    put("downloadStatus", "idle")
                }
            }

            val newArray = JSONArray()
            newArray.put(targetObj)
            for (i in 0 until jsonArray.length()) {
                if (newArray.length() >= 500) break // Cap to 500 songs
                newArray.put(jsonArray.get(i))
            }

            file.writeText(newArray.toString())
            Log.i(TAG, "Native: Successfully saved listened track to storage: '$title' by '$artist'")

            Handler(Looper.getMainLooper()).post {
                onTrackCommittedListener?.invoke(title, artist, album, trackId, durationMs)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error saving listened track to native storage", e)
        }
    }

    @Synchronized
    fun getListenedTracks(context: Context): List<Map<String, Any>> {
        val appContext = context.applicationContext ?: context
        val list = mutableListOf<Map<String, Any>>()
        try {
            val file = File(appContext.filesDir, FILE_NAME)
            if (!file.exists()) return list

            val content = file.readText()
            if (content.isBlank()) return list

            val jsonArray = JSONArray(content)
            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.getJSONObject(i)
                val map = mutableMapOf<String, Any>()
                map["id"] = item.optString("id", "")
                map["trackId"] = item.optString("trackId", "")
                map["title"] = item.optString("title", "")
                map["artist"] = item.optString("artist", "")
                map["album"] = item.optString("album", "")
                map["durationMs"] = item.optInt("durationMs", 0)
                map["firstListenedAt"] = item.optDouble("firstListenedAt", 0.0)
                map["lastListenedAt"] = item.optDouble("lastListenedAt", 0.0)
                map["listenCount"] = item.optInt("listenCount", 1)
                map["totalDurationListenedMs"] = item.optDouble("totalDurationListenedMs", 0.0)
                map["downloadStatus"] = item.optString("downloadStatus", "idle")
                list.add(map)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Error reading listened tracks", e)
        }
        return list
    }

    @Synchronized
    fun removeListenedTrack(context: Context, id: String): Boolean {
        val appContext = context.applicationContext ?: context
        try {
            val file = File(appContext.filesDir, FILE_NAME)
            if (!file.exists()) return false

            val content = file.readText()
            if (content.isBlank()) return false

            val jsonArray = JSONArray(content)
            val newArray = JSONArray()
            for (i in 0 until jsonArray.length()) {
                val item = jsonArray.getJSONObject(i)
                if (item.optString("id") != id) {
                    newArray.put(item)
                }
            }
            file.writeText(newArray.toString())
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error removing listened track", e)
            return false
        }
    }

    @Synchronized
    fun clearListenedTracks(context: Context): Boolean {
        val appContext = context.applicationContext ?: context
        return try {
            val file = File(appContext.filesDir, FILE_NAME)
            if (file.exists()) {
                file.delete()
            }
            true
        } catch (e: Exception) {
            Log.e(TAG, "Error clearing listened tracks", e)
            false
        }
    }
}
