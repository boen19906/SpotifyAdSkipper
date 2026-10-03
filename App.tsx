import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  SafeAreaView,
  StatusBar,
  AppState,
  AppStateStatus,
  Alert,
  TouchableOpacity,
  Text,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

import { Header } from './components/Header';
import { MasterPowerCard } from './components/MasterPowerCard';
import { ServiceStatusList } from './components/ServiceStatusList';
import { NowPlayingCard } from './components/NowPlayingCard';
import { StatsOverview } from './components/StatsOverview';
import { HistoryList } from './components/HistoryList';
import { SetupGuideModal } from './components/SetupGuideModal';
import { SettingsModal } from './components/SettingsModal';

import {
  isServiceRunning,
  startForegroundService,
  stopForegroundService,
  isNotificationAccessGranted,
  openNotificationAccessSettings,
  isAccessibilityServiceEnabled,
  openAccessibilitySettings,
  isIgnoringBatteryOptimizations,
  requestIgnoreBatteryOptimizations,
  isSpotifyInstalled,
  openSpotify,
  openSpotifySettings,
  triggerTestSkip,
  setConfig,
  getConfig,
  addAdDetectedListener,
  addAdSkippedListener,
  addMetadataChangedListener,
  SkipperConfig,
} from './modules/spotify-ad-skipper';

import {
  getStoredHistory,
  getStoredStats,
  saveSkipRecord,
  clearStoredHistory,
  SkipRecord,
} from './storage/historyStorage';

export default function App() {
  const [isEnabled, setIsEnabled] = useState(true);
  const [serviceRunning, setServiceRunning] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [accessibilityGranted, setAccessibilityGranted] = useState(false);
  const [batteryOptimized, setBatteryOptimized] = useState(false);
  const [spotifyInstalled, setSpotifyInstalled] = useState(true);

  // Live player state
  const [currentTrack, setCurrentTrack] = useState('');
  const [currentArtist, setCurrentArtist] = useState('');
  const [currentAlbum, setCurrentAlbum] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAd, setIsAd] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  // Stats & History
  const [totalSkipped, setTotalSkipped] = useState(0);
  const [totalSecondsSaved, setTotalSecondsSaved] = useState(0);
  const [history, setHistory] = useState<SkipRecord[]>([]);

  // Config & Modals
  const [config, setConfigState] = useState<SkipperConfig>({
    isEnabled: true,
    autoMute: true,
    restartDelayMs: 800,
    relaunchWaitMs: 2500,
    skipCount: 0,
  });
  const [guideVisible, setGuideVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Refresh all Android system permission & service states
  const refreshSystemStatus = useCallback(() => {
    try {
      const running = isServiceRunning();
      setServiceRunning(running);

      const notifGranted = isNotificationAccessGranted();
      setNotificationGranted(notifGranted);

      const accessGranted = isAccessibilityServiceEnabled();
      setAccessibilityGranted(accessGranted);

      const batteryOk = isIgnoringBatteryOptimizations();
      setBatteryOptimized(batteryOk);

      const installed = isSpotifyInstalled();
      setSpotifyInstalled(installed);

      const currentCfg = getConfig();
      setConfigState(currentCfg);
      setIsEnabled(currentCfg.isEnabled);
    } catch (e) {
      console.warn('Error checking system status', e);
    }
  }, []);

  // Initialize data on mount
  useEffect(() => {
    async function loadData() {
      const [storedStats, storedHistory] = await Promise.all([
        getStoredStats(),
        getStoredHistory(),
      ]);
      setTotalSkipped(storedStats.totalSkipped);
      setTotalSecondsSaved(storedStats.totalSecondsSaved);
      setHistory(storedHistory);
      refreshSystemStatus();

      // Automatically start background service if enabled
      try {
        if (!isServiceRunning()) {
          startForegroundService();
          setServiceRunning(true);
        }
      } catch (e) {
        console.warn('Auto start foreground service failed', e);
      }
    }

    loadData();

    // Re-check permissions when returning to app from Android Settings
    const subscription = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        if (nextState === 'active') {
          refreshSystemStatus();
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [refreshSystemStatus]);

  // Subscribe to native Spotify events
  useEffect(() => {
    const subDetected = addAdDetectedListener((event) => {
      console.log('Ad detected event:', event);
      setIsAd(true);
      setIsSkipping(true);
      setCurrentTrack(event.title || 'Spotify Advertisement');
      setCurrentArtist(event.artist || 'Sponsor');

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } catch {}
    });

    const subSkipped = addAdSkippedListener(async (event) => {
      console.log('Ad skipped event:', event);
      setIsAd(false);
      setIsSkipping(false);

      const result = await saveSkipRecord(
        event.title || 'Advertisement',
        event.durationSavedSeconds || 30,
        'auto'
      );
      setTotalSkipped(result.stats.totalSkipped);
      setTotalSecondsSaved(result.stats.totalSecondsSaved);
      setHistory(result.history);

      try {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    });

    const subMetadata = addMetadataChangedListener((event) => {
      setCurrentTrack(event.track);
      setCurrentArtist(event.artist);
      setCurrentAlbum(event.album);
      setIsPlaying(event.isPlaying);
      setIsAd(event.isAd);
    });

    return () => {
      subDetected.remove();
      subSkipped.remove();
      subMetadata.remove();
    };
  }, []);

  // Handlers
  const handleTogglePower = (newVal: boolean) => {
    setIsEnabled(newVal);
    setConfig(
      newVal,
      config.autoMute,
      config.restartDelayMs,
      config.relaunchWaitMs
    );

    if (newVal) {
      startForegroundService();
      setServiceRunning(true);
    } else {
      stopForegroundService();
      setServiceRunning(false);
    }
  };

  const handleToggleService = () => {
    if (serviceRunning) {
      stopForegroundService();
      setServiceRunning(false);
    } else {
      startForegroundService();
      setServiceRunning(true);
    }
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const handleRequestNotification = () => {
    openNotificationAccessSettings();
  };

  const handleRequestAccessibility = () => {
    openAccessibilitySettings();
  };

  const handleRequestBattery = () => {
    requestIgnoreBatteryOptimizations();
  };

  const handleOpenSpotify = () => {
    if (spotifyInstalled) {
      openSpotify();
    } else {
      Alert.alert(
        'Spotify Not Found',
        'Please install Spotify from the Google Play Store to use the ad skipper.',
        [{ text: 'OK' }]
      );
    }
  };

  const handleTestLoophole = () => {
    Alert.alert(
      'Test Restart Loophole',
      'This will simulate an ad detection, mute audio, exit Spotify, relaunch it, and resume your current playlist.\n\nMake sure Spotify is running with songs queued.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Run Test',
          onPress: async () => {
            setIsSkipping(true);
            setIsAd(true);
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } catch {}

            triggerTestSkip('Simulated Test Advertisement');

            // Record test in history
            setTimeout(async () => {
              const res = await saveSkipRecord('Simulated Test Advertisement', 30, 'test');
              setTotalSkipped(res.stats.totalSkipped);
              setTotalSecondsSaved(res.stats.totalSecondsSaved);
              setHistory(res.history);
              setIsSkipping(false);
              setIsAd(false);
            }, 3000);
          },
        },
      ]
    );
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to clear your skipped ads log and reset counters?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearStoredHistory();
            setHistory([]);
            setTotalSkipped(0);
            setTotalSecondsSaved(0);
          },
        },
      ]
    );
  };

  const handleSaveConfig = (newCfg: {
    enabled: boolean;
    autoMute: boolean;
    restartDelayMs: number;
    relaunchWaitMs: number;
  }) => {
    setConfig(
      newCfg.enabled,
      newCfg.autoMute,
      newCfg.restartDelayMs,
      newCfg.relaunchWaitMs
    );
    setConfigState({
      ...config,
      ...newCfg,
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0F12" />

      {/* Header */}
      <Header
        isActive={isEnabled && serviceRunning}
        onOpenGuide={() => setGuideVisible(true)}
      />

      <ScrollView
        style={styles.scrollArea}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Master Power Switch Card */}
        <MasterPowerCard
          isEnabled={isEnabled}
          onToggle={handleTogglePower}
          onOpenSpotify={handleOpenSpotify}
          isSpotifyInstalled={spotifyInstalled}
        />

        {/* Live Now Playing Monitor */}
        <NowPlayingCard
          track={currentTrack}
          artist={currentArtist}
          album={currentAlbum}
          isPlaying={isPlaying}
          isAd={isAd}
          isSkippingInProgress={isSkipping}
        />

        {/* System Readiness Checklist */}
        <ServiceStatusList
          isServiceRunning={serviceRunning}
          isNotificationGranted={notificationGranted}
          isAccessibilityGranted={accessibilityGranted}
          isBatteryOptimized={batteryOptimized}
          onToggleService={handleToggleService}
          onRequestNotificationAccess={handleRequestNotification}
          onRequestAccessibility={handleRequestAccessibility}
          onRequestBatteryExemption={handleRequestBattery}
          onOpenBroadcastGuide={() => setGuideVisible(true)}
        />

        {/* Stats & Loophole Testing */}
        <StatsOverview
          totalSkipped={totalSkipped}
          totalSecondsSaved={totalSecondsSaved}
          onTestLoophole={handleTestLoophole}
          isSkipping={isSkipping}
        />

        {/* Quick Settings Bar */}
        <View style={styles.settingsBar}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => setSettingsVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="options-outline" size={16} color="#94A3B8" />
            <Text style={styles.settingsButtonText}>Loophole Delay & Audio Settings</Text>
            <Ionicons name="chevron-forward" size={16} color="#64748B" />
          </TouchableOpacity>
        </View>

        {/* History Feed */}
        <HistoryList history={history} onClearHistory={handleClearHistory} />
      </ScrollView>

      {/* Modals */}
      <SetupGuideModal
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        onOpenSpotifySettings={openSpotifySettings}
        onOpenNotificationSettings={openNotificationAccessSettings}
        onOpenAccessibilitySettings={openAccessibilitySettings}
        onRequestBatteryExemption={requestIgnoreBatteryOptimizations}
      />

      <SettingsModal
        visible={settingsVisible}
        config={config}
        onClose={() => setSettingsVisible(false)}
        onSaveConfig={handleSaveConfig}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0D0F12',
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  settingsBar: {
    marginHorizontal: 20,
    marginTop: 14,
  },
  settingsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#161A22',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#262D38',
  },
  settingsButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#E2E8F0',
    flex: 1,
    marginLeft: 10,
  },
});
