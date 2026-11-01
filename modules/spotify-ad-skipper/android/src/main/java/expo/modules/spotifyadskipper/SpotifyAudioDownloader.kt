package expo.modules.spotifyadskipper

import android.content.ContentValues
import android.content.Context
import android.content.SharedPreferences
import android.media.MediaScannerConnection
import android.os.Build
import android.os.Environment
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
import android.util.Log
import com.yausername.ffmpeg.FFmpeg
import com.yausername.youtubedl_android.YoutubeDL
import com.yausername.youtubedl_android.YoutubeDLRequest
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.launch
import java.io.File
import java.net.URLEncoder
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicBoolean

object SpotifyAudioDownloader {
    private const val TAG = "SpotifyAudioDownloader"
    private const val PREFS_NAME = "spotify_ad_skipper_prefs"
    private const val KEY_AUTO_DOWNLOAD = "auto_download_music"

    private val isInitialized = AtomicBoolean(false)
    private val scope = CoroutineScope(Dispatchers.IO + Job())
    private val downloadQueue = Channel<DownloadTask>(Channel.UNLIMITED)
    private val isWorkerRunning = AtomicBoolean(false)

    // In-memory status map: id or trackId -> Status
    val activeTasks = ConcurrentHashMap<String, DownloadTask>()

    var autoDownloadEnabled: Boolean = true

    // Listener for UI callbacks
    var onDownloadStatusChanged: ((id: String, trackId: String, title: String, artist: String, status: String, progress: Float, filePath: String?, error: String?) -> Unit)? = null

    data class DownloadTask(
        val id: String,
        val trackId: String,
        val title: String,
        val artist: String,
        val album: String,
        val durationMs: Int = 0,
        var status: String = "queued", // queued, downloading, downloaded, failed
        var progress: Float = 0f,
        var filePath: String? = null,
        var error: String? = null
    )

    fun init(context: Context) {
        val appContext = context.applicationContext ?: context
        loadPreferences(appContext)

        if (isInitialized.compareAndSet(false, true)) {
            scope.launch {
                try {
                    YoutubeDL.getInstance().init(appContext)
                    FFmpeg.getInstance().init(appContext)
                    Log.i(TAG, "YoutubeDL and FFmpeg initialized successfully")
                } catch (e: Exception) {
                    Log.e(TAG, "Failed to initialize YoutubeDL / FFmpeg", e)
                }
            }
            startWorker(appContext)
        }
    }

    private fun loadPreferences(context: Context) {
        try {
            val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            autoDownloadEnabled = prefs.getBoolean(KEY_AUTO_DOWNLOAD, true)
        } catch (e: Exception) {
            Log.e(TAG, "Error loading auto-download preferences", e)
        }
    }

    fun setAutoDownload(context: Context, enabled: Boolean) {
        autoDownloadEnabled = enabled
        try {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            prefs.edit().putBoolean(KEY_AUTO_DOWNLOAD, enabled).apply()
            Log.i(TAG, "Auto-download set to: $enabled")
        } catch (e: Exception) {
            Log.e(TAG, "Error saving auto-download preference", e)
        }
    }

    fun getMusicDirectory(context: Context): File {
        // App external files dir is on external storage (/sdcard/Android/data/com.spotifyadskip.app/files/Music/SpotifyAdSkipper)
        // It provides full POSIX read/write access for Python, yt-dlp, and FFmpeg without Scoped Storage Errno 1!
        val extMusic = File(context.getExternalFilesDir(Environment.DIRECTORY_MUSIC), "SpotifyAdSkipper")
        if (!extMusic.exists()) {
            extMusic.mkdirs()
        }
        return extMusic
    }

    private fun sanitizeFileName(name: String): String {
        return name.replace("[\\\\/:*?\"<>|]".toRegex(), "_").trim()
    }

    fun enqueueDownload(
        context: Context,
        title: String,
        artist: String,
        album: String,
        trackId: String,
        customId: String? = null,
        durationMs: Int = 0
    ): String {
        val appContext = context.applicationContext ?: context
        init(appContext)

        val cleanTitle = title.trim()
        val cleanArtist = artist.trim()
        val taskId = customId ?: "${cleanArtist}_${cleanTitle}".replace(" ", "_")

        // Check if file already exists locally
        val targetDir = getMusicDirectory(appContext)
        val expectedBaseName = "${sanitizeFileName(cleanArtist)} - ${sanitizeFileName(cleanTitle)}"
        val potentialFile = File(targetDir, "$expectedBaseName.mp3")

        if (potentialFile.exists() && potentialFile.length() > 50_000L) {
            Log.i(TAG, "Track already downloaded: ${potentialFile.absolutePath}")
            val task = DownloadTask(
                id = taskId,
                trackId = trackId,
                title = cleanTitle,
                artist = cleanArtist,
                album = album,
                durationMs = durationMs,
                status = "downloaded",
                progress = 100f,
                filePath = potentialFile.absolutePath
            )
            activeTasks[taskId] = task
            notifyStatusChanged(task)
            SpotifyTrackHistoryManager.updateTrackDownloadStatus(
                appContext,
                taskId,
                cleanTitle,
                cleanArtist,
                "downloaded",
                potentialFile.absolutePath
            )
            return taskId
        }

        val existingTask = activeTasks[taskId]
        if (existingTask != null && (existingTask.status == "queued" || existingTask.status == "downloading")) {
            Log.d(TAG, "Task already queued or in progress: $taskId")
            return taskId
        }

        val task = DownloadTask(
            id = taskId,
            trackId = trackId,
            title = cleanTitle,
            artist = cleanArtist,
            album = album,
            durationMs = durationMs,
            status = "queued"
        )
        activeTasks[taskId] = task
        notifyStatusChanged(task)

        SpotifyTrackHistoryManager.updateTrackDownloadStatus(
            appContext,
            taskId,
            cleanTitle,
            cleanArtist,
            "queued",
            null
        )

        scope.launch {
            downloadQueue.send(task)
        }
        return taskId
    }

    private fun startWorker(context: Context) {
        if (!isWorkerRunning.compareAndSet(false, true)) return

        scope.launch {
            for (task in downloadQueue) {
                processDownload(context, task)
            }
        }
    }

    private fun processDownload(context: Context, task: DownloadTask) {
        val targetDir = getMusicDirectory(context)
        val cleanArtist = sanitizeFileName(task.artist)
        val cleanTitle = sanitizeFileName(task.title)
        val outFileName = "$cleanArtist - $cleanTitle"

        task.status = "downloading"
        task.progress = 0f
        notifyStatusChanged(task)
        SpotifyTrackHistoryManager.updateTrackDownloadStatus(
            context,
            task.id,
            task.title,
            task.artist,
            "downloading",
            null
        )

        try {
            val baseSearch = if (task.artist.isNotBlank()) {
                "${task.artist} - ${task.title}"
            } else {
                task.title
            }

            Log.i(TAG, "Starting audio download for '$outFileName' (base: '$baseSearch', durationMs=${task.durationMs})")

            // Configure duration filter to prevent downloading wrong songs, compilations, or tiny previews
            val strictDurationFilter: String? = if (task.durationMs > 0) {
                val expectedSec = task.durationMs / 1000
                val minSec = maxOf(10, expectedSec - 30)
                val maxSec = expectedSec + 30
                "duration >= $minSec & duration <= $maxSec"
            } else {
                // General sanity bounds: 40s to 15m
                "duration >= 40 & duration <= 900"
            }

            val relaxedDurationFilter: String? = if (task.durationMs > 0) {
                val expectedSec = task.durationMs / 1000
                val minSec = maxOf(10, expectedSec - 60)
                val maxSec = expectedSec + 60
                "duration >= $minSec & duration <= $maxSec"
            } else {
                null
            }

            // Encoded query not needed with ytsearch
            data class SearchCandidate(
                val query: String,
                val durationFilter: String?,
                val useSponsorBlock: Boolean
            )

            val searchStrategies = mutableListOf<SearchCandidate>()

            // 1. YouTube Topic Track (Official album distribution track from YouTube Music / Label).
            // Topic tracks NEVER have music video intros or talking, are not age-restricted,
            // and omitting SponsorBlock avoids "Cannot cut video since the real and expected durations mismatch" errors!
            searchStrategies.add(SearchCandidate("ytsearch5:$baseSearch Topic", strictDurationFilter, useSponsorBlock = false))

            // 2. Official Audio with SponsorBlock (cuts dialogue if video has skits)
            searchStrategies.add(SearchCandidate("ytsearch5:$baseSearch \"Official Audio\"", strictDurationFilter, useSponsorBlock = true))

            // 3. Official Audio without SponsorBlock (in case SponsorBlock fails postprocessing)
            searchStrategies.add(SearchCandidate("ytsearch5:$baseSearch \"Official Audio\"", strictDurationFilter, useSponsorBlock = false))

            // 4. Audio with SponsorBlock
            searchStrategies.add(SearchCandidate("ytsearch5:$baseSearch Audio", strictDurationFilter, useSponsorBlock = true))

            // 5. Standard YouTube search with SponsorBlock
            searchStrategies.add(SearchCandidate("ytsearch5:$baseSearch", strictDurationFilter, useSponsorBlock = true))

            // 6. Standard YouTube search without SponsorBlock
            searchStrategies.add(SearchCandidate("ytsearch5:$baseSearch", strictDurationFilter, useSponsorBlock = false))

            // 7. Relaxed fallback if strict filter failed to match
            if (relaxedDurationFilter != null) {
                searchStrategies.add(SearchCandidate("ytsearch3:$baseSearch", relaxedDurationFilter, useSponsorBlock = false))
            }

            var downloadSuccess = false
            var lastError: Exception? = null

            for ((index, strategy) in searchStrategies.withIndex()) {
                Log.d(TAG, "Attempt ${index + 1}/${searchStrategies.size}: Query='${strategy.query}', Filter='${strategy.durationFilter}', SponsorBlock=${strategy.useSponsorBlock}")
                try {
                    val request = YoutubeDLRequest(strategy.query).apply {
                        addOption("-x") // Extract audio
                        addOption("--audio-format", "mp3")
                        addOption("--audio-quality", "0") // 320kbps MP3
                        addOption("-4") // Force IPv4
                        addOption("-i") // Continue with next search candidate on errors (e.g. age-restricted MV)
                        addOption("--no-playlist")
                        addOption("--no-warnings")
                        addOption("--no-abort-on-error")
                        addOption("--retries", "3")
                        addOption("--embed-metadata")
                        addOption("--embed-thumbnail")
                        addOption("--convert-thumbnails", "jpg")

                        // Remove video skits, narrative intros, outros, and non-music sections if enabled
                        if (strategy.useSponsorBlock) {
                            addOption("--sponsorblock-remove", "music_offtopic,intro,outro,filler")
                        }

                        // Only download 1 track
                        addOption("--max-downloads", "1")

                        // Apply duration match filter
                        if (!strategy.durationFilter.isNullOrBlank()) {
                            addOption("--match-filters", strategy.durationFilter)
                        }

                        // Client extractor arguments & formats (android player client avoids SABR 403 Forbidden)
                        addOption("--extractor-args", "youtube:player_client=android")
                        addOption("-f", "ba/b")

                        addOption("-o", "${targetDir.absolutePath}/$outFileName.%(ext)s")
                    }

                    try {
                        YoutubeDL.getInstance().execute(request) { progress, _, _ ->
                            task.progress = progress
                            notifyStatusChanged(task)
                        }
                    } catch (e: Exception) {
                        lastError = e
                        Log.d(TAG, "Search strategy ${index + 1} execution finished with notice: ${e.message}")
                    }

                    val finalFile = File(targetDir, "$outFileName.mp3")
                    if (finalFile.exists() && finalFile.length() > 50_000L) {
                        downloadSuccess = true
                        handleSuccess(context, task, finalFile)
                        break
                    } else if (finalFile.exists()) {
                        // Clean up zero/corrupt byte file from unsuccessful attempt
                        finalFile.delete()
                    }
                } catch (e: Exception) {
                    lastError = e
                    Log.w(TAG, "Search strategy ${index + 1} failed: ${e.message}")
                }
            }

            if (!downloadSuccess) {
                throw (lastError ?: IllegalStateException("All download strategies failed to match or download track"))
            }
        } catch (e: Exception) {
            Log.e(TAG, "Download failed for '${task.title}'", e)
            task.status = "failed"
            task.error = e.message ?: "Download failed"
            notifyStatusChanged(task)
            SpotifyTrackHistoryManager.updateTrackDownloadStatus(
                context,
                task.id,
                task.title,
                task.artist,
                "failed",
                null
            )
        }
    }

    private fun handleSuccess(context: Context, task: DownloadTask, finalFile: File) {
        task.status = "downloaded"
        task.progress = 100f
        task.filePath = finalFile.absolutePath
        task.error = null

        // Scan file so Android MediaStore indexes it for all music players
        try {
            MediaScannerConnection.scanFile(
                context,
                arrayOf(finalFile.absolutePath),
                arrayOf("audio/mpeg"),
                null
            )
        } catch (e: Exception) {
            Log.w(TAG, "MediaScanner error", e)
        }

        // Export to public MediaStore Music folder so other apps can play it
        exportToMediaStore(context, finalFile, task.title, task.artist, task.album)

        Log.i(TAG, "Audio download completed successfully: ${finalFile.absolutePath} (${finalFile.length()} bytes)")
        notifyStatusChanged(task)
        SpotifyTrackHistoryManager.updateTrackDownloadStatus(
            context,
            task.id,
            task.title,
            task.artist,
            "downloaded",
            finalFile.absolutePath
        )
    }

    private fun exportToMediaStore(context: Context, srcFile: File, title: String, artist: String, album: String) {
        try {
            val resolver = context.contentResolver
            val displayName = "${sanitizeFileName(artist)} - ${sanitizeFileName(title)}.mp3"
            val contentValues = ContentValues().apply {
                put(MediaStore.Audio.Media.DISPLAY_NAME, displayName)
                put(MediaStore.Audio.Media.TITLE, title)
                put(MediaStore.Audio.Media.ARTIST, artist)
                if (album.isNotBlank()) {
                    put(MediaStore.Audio.Media.ALBUM, album)
                }
                put(MediaStore.Audio.Media.MIME_TYPE, "audio/mpeg")
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    put(MediaStore.Audio.Media.RELATIVE_PATH, "${Environment.DIRECTORY_MUSIC}/SpotifyAdSkipper")
                    put(MediaStore.Audio.Media.IS_PENDING, 1)
                }
            }

            val uri = resolver.insert(MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, contentValues)
            if (uri != null) {
                resolver.openOutputStream(uri)?.use { outputStream ->
                    srcFile.inputStream().use { inputStream ->
                        inputStream.copyTo(outputStream)
                    }
                }
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    contentValues.clear()
                    contentValues.put(MediaStore.Audio.Media.IS_PENDING, 0)
                    resolver.update(uri, contentValues, null, null)
                }
                Log.i(TAG, "Successfully exported to public MediaStore Music: $uri")
            }
        } catch (e: Exception) {
            Log.w(TAG, "Non-critical: MediaStore public export skipped", e)
        }
    }

    private fun notifyStatusChanged(task: DownloadTask) {
        Handler(Looper.getMainLooper()).post {
            onDownloadStatusChanged?.invoke(
                task.id,
                task.trackId,
                task.title,
                task.artist,
                task.status,
                task.progress,
                task.filePath,
                task.error
            )
        }
    }

    fun redownloadAll(context: Context) {
        val appContext = context.applicationContext ?: context
        init(appContext)

        scope.launch {
            try {
                val tracks = SpotifyTrackHistoryManager.getListenedTracks(appContext)
                Log.i(TAG, "redownloadAll: Found ${tracks.size} tracks in library to redownload")

                val targetDir = getMusicDirectory(appContext)

                for (track in tracks) {
                    val title = (track["title"] as? String)?.trim() ?: ""
                    val artist = (track["artist"] as? String)?.trim() ?: ""
                    val album = (track["album"] as? String)?.trim() ?: ""
                    val trackId = (track["trackId"] as? String)?.trim() ?: ""
                    val id = (track["id"] as? String)?.trim() ?: ""
                    val durationMs = (track["durationMs"] as? Number)?.toInt() ?: 0

                    if (title.isBlank()) continue

                    val cleanArtist = sanitizeFileName(artist)
                    val cleanTitle = sanitizeFileName(title)
                    val existingFile = File(targetDir, "$cleanArtist - $cleanTitle.mp3")

                    // Delete existing file so enqueueDownload doesn't consider it already downloaded
                    if (existingFile.exists()) {
                        existingFile.delete()
                    }

                    val taskId = if (id.isNotBlank()) id else "${cleanArtist}_${cleanTitle}".replace(" ", "_")
                    activeTasks.remove(taskId)

                    enqueueDownload(
                        appContext,
                        title,
                        artist,
                        album,
                        trackId,
                        customId = taskId,
                        durationMs = durationMs
                    )
                }
            } catch (e: Exception) {
                Log.e(TAG, "Error in redownloadAll", e)
            }
        }
    }
}
