const { withAndroidManifest } = require('@expo/config-plugins');

function withSpotifyAdSkip(config) {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // 1. Ensure permissions
    const permissions = [
      'android.permission.FOREGROUND_SERVICE',
      'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
      'android.permission.KILL_BACKGROUND_PROCESSES',
      'android.permission.RECEIVE_BOOT_COMPLETED',
      'android.permission.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS',
      'android.permission.POST_NOTIFICATIONS',
      'android.permission.MODIFY_AUDIO_SETTINGS',
      'android.permission.WAKE_LOCK',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ];

    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    permissions.forEach((permission) => {
      if (
        !androidManifest['uses-permission'].some(
          (p) => p.$['android:name'] === permission
        )
      ) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // 2. Ensure queries for Spotify package
    if (!androidManifest.queries) {
      androidManifest.queries = [];
    }
    const hasSpotifyQuery = androidManifest.queries.some(
      (q) => q.package && q.package.some((p) => p.$['android:name'] === 'com.spotify.music')
    );
    if (!hasSpotifyQuery) {
      androidManifest.queries.push({
        package: [{ $: { 'android:name': 'com.spotify.music' } }],
      });
    }

    // 3. Application services & receivers
    const app = androidManifest.application[0];
    if (!app.service) {
      app.service = [];
    }
    if (!app.receiver) {
      app.receiver = [];
    }

    // Foreground service
    const fgServiceName = 'expo.modules.spotifyadskipper.SpotifyAdSkipForegroundService';
    if (!app.service.some((s) => s.$['android:name'] === fgServiceName)) {
      app.service.push({
        $: {
          'android:name': fgServiceName,
          'android:enabled': 'true',
          'android:exported': 'false',
          'android:foregroundServiceType': 'mediaPlayback',
        },
      });
    }

    // Notification listener service
    const notifServiceName = 'expo.modules.spotifyadskipper.SpotifyNotificationListener';
    if (!app.service.some((s) => s.$['android:name'] === notifServiceName)) {
      app.service.push({
        $: {
          'android:name': notifServiceName,
          'android:label': 'Spotify Ad Skip Listener',
          'android:permission': 'android.permission.BIND_NOTIFICATION_LISTENER_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.service.notification.NotificationListenerService',
                },
              },
            ],
          },
        ],
      });
    }

    // Accessibility service for automated Force Stop on modern Android (14+)
    const accessServiceName = 'expo.modules.spotifyadskipper.SpotifyAccessibilityService';
    if (!app.service.some((s) => s.$['android:name'] === accessServiceName)) {
      app.service.push({
        $: {
          'android:name': accessServiceName,
          'android:label': 'Spotify Ad Skip Auto-Exit Service',
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              {
                $: {
                  'android:name': 'android.accessibilityservice.AccessibilityService',
                },
              },
            ],
          },
        ],
        'meta-data': [
          {
            $: {
              'android:name': 'android.accessibilityservice',
              'android:resource': '@xml/accessibility_service_config',
            },
          },
        ],
      });
    }

    // Broadcast receiver
    const receiverName = 'expo.modules.spotifyadskipper.SpotifyBroadcastReceiver';
    if (!app.receiver.some((r) => r.$['android:name'] === receiverName)) {
      app.receiver.push({
        $: {
          'android:name': receiverName,
          'android:exported': 'true',
        },
        'intent-filter': [
          {
            action: [
              { $: { 'android:name': 'com.spotify.music.metadatachanged' } },
              { $: { 'android:name': 'com.spotify.music.playbackstatechanged' } },
              { $: { 'android:name': 'com.spotify.music.queuechanged' } },
            ],
          },
        ],
      });
    }

    // Wake Activity to turn screen on & dismiss lockscreen under Extend Unlock
    if (!app.activity) {
      app.activity = [];
    }
    const wakeActivityName = 'expo.modules.spotifyadskipper.SpotifyWakeActivity';
    if (!app.activity.some((a) => a.$['android:name'] === wakeActivityName)) {
      app.activity.push({
        $: {
          'android:name': wakeActivityName,
          'android:exported': 'false',
          'android:showWhenLocked': 'true',
          'android:turnScreenOn': 'true',
          'android:excludeFromRecents': 'true',
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar',
        },
      });
    }

    return config;
  });
}

module.exports = withSpotifyAdSkip;
