package expo.modules.spotifyadskipper

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import androidx.core.app.NotificationManagerCompat
import androidx.core.content.ContextCompat
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class SpotifyAdSkipperModule : Module() {
    private val context: Context
        get() = appContext.reactContext ?: throw IllegalStateException("React Context is null")

    override fun definition() = ModuleDefinition {
        Name("SpotifyAdSkipper")

        Events("onAdDetected", "onAdSkipped", "onMetadataChanged")

        OnCreate {
            SpotifyAdSkipController.onAdDetectedListener = { title, artist ->
                sendEvent("onAdDetected", mapOf(
                    "title" to title,
                    "artist" to artist
                ))
            }

            SpotifyAdSkipController.onAdSkippedListener = { title, durationSaved, timestamp ->
                sendEvent("onAdSkipped", mapOf(
                    "title" to title,
                    "durationSavedSeconds" to durationSaved,
                    "timestamp" to timestamp.toDouble()
                ))
            }

            SpotifyAdSkipController.onMetadataChangedListener = { track, artist, album, isPlaying, isAd ->
                sendEvent("onMetadataChanged", mapOf(
                    "track" to track,
                    "artist" to artist,
                    "album" to album,
                    "isPlaying" to isPlaying,
                    "isAd" to isAd
                ))
            }
        }

        Function("isServiceRunning") {
            SpotifyAdSkipForegroundService.isRunning
        }

        Function("startForegroundService") {
            val intent = Intent(context, SpotifyAdSkipForegroundService::class.java).apply {
                action = SpotifyAdSkipForegroundService.ACTION_START
            }
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                ContextCompat.startForegroundService(context, intent)
            } else {
                context.startService(intent)
            }
            true
        }

        Function("stopForegroundService") {
            val intent = Intent(context, SpotifyAdSkipForegroundService::class.java).apply {
                action = SpotifyAdSkipForegroundService.ACTION_STOP
            }
            context.startService(intent)
            true
        }

        Function("isNotificationAccessGranted") {
            val enabledListeners = NotificationManagerCompat.getEnabledListenerPackages(context)
            enabledListeners.contains(context.packageName)
        }

        Function("openNotificationAccessSettings") {
            val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        }

        Function("isAccessibilityServiceEnabled") {
            if (SpotifyAccessibilityService.isRunning) return@Function true
            val expectedService = "${context.packageName}/${SpotifyAccessibilityService::class.java.name}"
            val enabledServices = Settings.Secure.getString(
                context.contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""
            enabledServices.contains(context.packageName) || enabledServices.contains(expectedService)
        }

        Function("openAccessibilitySettings") {
            val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        }

        Function("isIgnoringBatteryOptimizations") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                val powerManager = context.getSystemService(Context.POWER_SERVICE) as? PowerManager
                powerManager?.isIgnoringBatteryOptimizations(context.packageName) ?: false
            } else {
                true
            }
        }

        Function("requestIgnoreBatteryOptimizations") {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                try {
                    val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS).apply {
                        data = Uri.parse("package:${context.packageName}")
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    true
                } catch (e: Exception) {
                    val intent = Intent(Settings.ACTION_IGNORE_BATTERY_OPTIMIZATION_SETTINGS).apply {
                        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                    }
                    context.startActivity(intent)
                    true
                }
            } else {
                true
            }
        }

        Function("isSpotifyInstalled") {
            SpotifyAdSkipController.isSpotifyInstalled(context)
        }

        Function("openSpotify") {
            val launchIntent = context.packageManager.getLaunchIntentForPackage(SpotifyAdSkipController.SPOTIFY_PACKAGE)
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                context.startActivity(launchIntent)
                true
            } else {
                false
            }
        }

        Function("openSpotifySettings") {
            val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS).apply {
                data = Uri.parse("package:${SpotifyAdSkipController.SPOTIFY_PACKAGE}")
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            context.startActivity(intent)
            true
        }

        Function("triggerTestSkip") { testTitle: String ->
            SpotifyAdSkipController.triggerManualTestSkip(context, testTitle)
            true
        }

        Function("setConfig") { enabled: Boolean, autoMute: Boolean, restartDelayMs: Double, relaunchWaitMs: Double ->
            SpotifyAdSkipController.isEnabled = enabled
            SpotifyAdSkipController.autoMute = autoMute
            SpotifyAdSkipController.restartDelayMs = restartDelayMs.toLong()
            SpotifyAdSkipController.relaunchWaitMs = relaunchWaitMs.toLong()
            true
        }

        Function("getConfig") {
            mapOf(
                "isEnabled" to SpotifyAdSkipController.isEnabled,
                "autoMute" to SpotifyAdSkipController.autoMute,
                "restartDelayMs" to SpotifyAdSkipController.restartDelayMs.toDouble(),
                "relaunchWaitMs" to SpotifyAdSkipController.relaunchWaitMs.toDouble(),
                "skipCount" to SpotifyAdSkipController.skipCount
            )
        }

        Function("getSkipCount") {
            SpotifyAdSkipController.skipCount
        }
    }
}
