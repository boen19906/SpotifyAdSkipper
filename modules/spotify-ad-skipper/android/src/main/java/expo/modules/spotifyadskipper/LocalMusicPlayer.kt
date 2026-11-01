package expo.modules.spotifyadskipper

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.util.Log
import java.io.File

object LocalMusicPlayer {
    private const val TAG = "LocalMusicPlayer"

    private var appContext: Context? = null
    private var audioManager: AudioManager? = null
    private var audioFocusRequest: AudioFocusRequest? = null
    private var mediaPlayer: MediaPlayer? = null
    private val handler = Handler(Looper.getMainLooper())
    private var progressRunnable: Runnable? = null

    var currentFilePath: String = ""
    var currentTitle: String = ""
    var currentArtist: String = ""
    var isPlaying: Boolean = false

    var onPlayerStateChanged: ((isPlaying: Boolean, positionMs: Int, durationMs: Int, title: String, artist: String, filePath: String) -> Unit)? = null
    var onSongCompleted: (() -> Unit)? = null

    fun init(context: Context) {
        appContext = context.applicationContext
        audioManager = context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
    }

    private val audioFocusChangeListener = AudioManager.OnAudioFocusChangeListener { focusChange ->
        Log.i(TAG, "Audio focus changed: $focusChange")
        if (focusChange == AudioManager.AUDIOFOCUS_LOSS || focusChange == AudioManager.AUDIOFOCUS_LOSS_TRANSIENT) {
            pause()
        }
    }

    private fun requestFocus(): Boolean {
        return try {
            val am = audioManager ?: return true
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                // Abandon any existing request first so Android doesn't send AUDIOFOCUS_LOSS to our own prior request
                audioFocusRequest?.let {
                    try {
                        am.abandonAudioFocusRequest(it)
                    } catch (e: Exception) {}
                }
                audioFocusRequest = null

                val attrs = AudioAttributes.Builder()
                    .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                    .setUsage(AudioAttributes.USAGE_MEDIA)
                    .build()
                val req = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN)
                    .setAudioAttributes(attrs)
                    .setOnAudioFocusChangeListener(audioFocusChangeListener)
                    .build()
                audioFocusRequest = req
                am.requestAudioFocus(req) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            } else {
                @Suppress("DEPRECATION")
                am.requestAudioFocus(
                    audioFocusChangeListener,
                    AudioManager.STREAM_MUSIC,
                    AudioManager.AUDIOFOCUS_GAIN
                ) == AudioManager.AUDIOFOCUS_REQUEST_GRANTED
            }
        } catch (e: Exception) {
            true
        }
    }

    private fun abandonFocus() {
        try {
            val am = audioManager ?: return
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                audioFocusRequest?.let {
                    try {
                        am.abandonAudioFocusRequest(it)
                    } catch (e: Exception) {}
                }
                audioFocusRequest = null
            } else {
                @Suppress("DEPRECATION")
                am.abandonAudioFocus(audioFocusChangeListener)
            }
        } catch (e: Exception) {}
    }

    @Synchronized
    fun play(filePath: String, title: String, artist: String): Boolean {
        try {
            var file = File(filePath)
            if (!file.exists() || file.length() == 0L) {
                val ctx = appContext
                if (ctx != null) {
                    val fallbackFile = File(SpotifyAudioDownloader.getMusicDirectory(ctx), file.name)
                    if (fallbackFile.exists() && fallbackFile.length() > 0L) {
                        file = fallbackFile
                    } else {
                        Log.e(TAG, "File does not exist or is empty: $filePath")
                        return false
                    }
                } else {
                    Log.e(TAG, "File does not exist or is empty: $filePath")
                    return false
                }
            }

            stopProgressUpdates()
            try {
                mediaPlayer?.stop()
                mediaPlayer?.release()
            } catch (e: Exception) {}
            mediaPlayer = null

            requestFocus()

            val player = MediaPlayer().apply {
                setAudioAttributes(
                    AudioAttributes.Builder()
                        .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                        .setUsage(AudioAttributes.USAGE_MEDIA)
                        .build()
                )
                setDataSource(file.absolutePath)
                prepare()
                start()
            }

            currentFilePath = file.absolutePath
            currentTitle = title
            currentArtist = artist
            isPlaying = true
            mediaPlayer = player

            player.setOnCompletionListener {
                isPlaying = false
                stopProgressUpdates()
                notifyState()
                Handler(Looper.getMainLooper()).post {
                    onSongCompleted?.invoke()
                }
            }

            player.setOnErrorListener { _, what, extra ->
                Log.e(TAG, "MediaPlayer error: what=$what, extra=$extra")
                isPlaying = false
                stopProgressUpdates()
                notifyState()
                true
            }

            startProgressUpdates()
            notifyState()
            Log.i(TAG, "Playing local audio: '$title' by '$artist'")
            return true
        } catch (e: Exception) {
            Log.e(TAG, "Error playing audio file: $filePath", e)
            isPlaying = false
            return false
        }
    }

    @Synchronized
    fun pause(): Boolean {
        return try {
            if (mediaPlayer?.isPlaying == true) {
                mediaPlayer?.pause()
                isPlaying = false
                abandonFocus()
                stopProgressUpdates()
                notifyState()
                true
            } else false
        } catch (e: Exception) {
            false
        }
    }

    @Synchronized
    fun resume(): Boolean {
        return try {
            if (mediaPlayer != null && !isPlaying) {
                requestFocus()
                mediaPlayer?.start()
                isPlaying = true
                startProgressUpdates()
                notifyState()
                true
            } else false
        } catch (e: Exception) {
            false
        }
    }

    @Synchronized
    fun seekTo(positionMs: Int): Boolean {
        return try {
            mediaPlayer?.seekTo(positionMs)
            notifyState()
            true
        } catch (e: Exception) {
            false
        }
    }

    @Synchronized
    fun stop(): Boolean {
        return try {
            abandonFocus()
            stopProgressUpdates()
            try {
                mediaPlayer?.stop()
                mediaPlayer?.release()
            } catch (e: Exception) {}
            mediaPlayer = null
            isPlaying = false
            currentFilePath = ""
            currentTitle = ""
            currentArtist = ""
            notifyState()
            true
        } catch (e: Exception) {
            false
        }
    }

    fun getState(): Map<String, Any> {
        val pos = mediaPlayer?.currentPosition ?: 0
        val dur = mediaPlayer?.duration ?: 0
        return mapOf(
            "isPlaying" to isPlaying,
            "positionMs" to pos,
            "durationMs" to dur,
            "title" to currentTitle,
            "artist" to currentArtist,
            "filePath" to currentFilePath
        )
    }

    private fun startProgressUpdates() {
        stopProgressUpdates()
        progressRunnable = object : Runnable {
            override fun run() {
                if (isPlaying && mediaPlayer != null) {
                    notifyState()
                    handler.postDelayed(this, 500)
                }
            }
        }
        handler.post(progressRunnable!!)
    }

    private fun stopProgressUpdates() {
        progressRunnable?.let { handler.removeCallbacks(it) }
        progressRunnable = null
    }

    private fun notifyState() {
        val pos = mediaPlayer?.currentPosition ?: 0
        val dur = mediaPlayer?.duration ?: 0
        Handler(Looper.getMainLooper()).post {
            onPlayerStateChanged?.invoke(isPlaying, pos, dur, currentTitle, currentArtist, currentFilePath)
        }
    }
}
