import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  StatusBar,
  AppState,
  AppStateStatus,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';

import { Header } from './components/Header';
import { HeroCard } from './components/HeroCard';
import { CategoryPills, FilterCategory } from './components/CategoryPills';
import { ServiceStatusList } from './components/ServiceStatusList';
import { StatsOverview } from './components/StatsOverview';
import { HistoryList } from './components/HistoryList';
import { ListenedLibrary } from './components/ListenedLibrary';
import { BottomNav, BottomNavTab } from './components/BottomNav';
import { SetupGuideModal } from './components/SetupGuideModal';
import { SettingsModal } from './components/SettingsModal';
import { useListenedTracker } from './hooks/useListenedTracker';

import { lightTheme, darkTheme } from './theme';

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

import {
  getStoredTheme,
  saveStoredTheme,
  getStoredConfig,
  saveStoredConfig,
} from './storage/settingsStorage';

export default function App() {
  // Theme state: defaults to light mode to match the inspired editorial screenshot, but fully supports dark mode!
  const [isDark, setIsDark] = useState(false);
  const theme = isDark ? darkTheme : lightTheme;

  // Navigation tab & filter state
  const [activeTab, setActiveTab] = useState<BottomNavTab>('skipper');
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');

  // Service & Protection state
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

  // Tracked songs library hook
  const {
    listenedTracks,
    stats: listenedStats,
    activePlayback,
    deleteTrack: handleDeleteListenedTrack,
    clearAll: handleClearListenedTracks,
  } = useListenedTracker();

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
      const [storedStats, storedHistory, storedTheme, storedConfig] = await Promise.all([
        getStoredStats(),
        getStoredHistory(),
        getStoredTheme(),
        getStoredConfig(),
      ]);
      setTotalSkipped(storedStats.totalSkipped);
      setTotalSecondsSaved(storedStats.totalSecondsSaved);
      setHistory(storedHistory);

      if (storedTheme !== null) {
        setIsDark(storedTheme);
      }

      if (storedConfig) {
        setConfigState((prev) => ({ ...prev, ...storedConfig }));
        if (typeof storedConfig.isEnabled === 'boolean') {
          setIsEnabled(storedConfig.isEnabled);
        }
        setConfig(
          storedConfig.isEnabled ?? true,
          storedConfig.autoMute ?? true,
          storedConfig.restartDelayMs ?? 800,
          storedConfig.relaunchWaitMs ?? 2500
        );
      }

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
  const handleTogglePower = async (newVal: boolean) => {
    setIsEnabled(newVal);
    setConfig(
      newVal,
      config.autoMute,
      config.restartDelayMs,
      config.relaunchWaitMs
    );
    const updated = {
      ...config,
      isEnabled: newVal,
    };
    setConfigState(updated);
    await saveStoredConfig(updated);

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

  const handleToggleTheme = async () => {
    const nextDark = !isDark;
    setIsDark(nextDark);
    await saveStoredTheme(nextDark);
  };

  const handleSaveConfig = async (newCfg: {
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
    const updated = {
      ...config,
      ...newCfg,
    };
    setConfigState(updated);
    await saveStoredConfig(updated);
  };

  const handleSelectCategory = (cat: FilterCategory) => {
    setSelectedCategory(cat);
    if (cat === 'settings') {
      setSettingsVisible(true);
    } else if (cat === 'readiness') {
      setActiveTab('readiness');
    } else if (cat === 'stats' || cat === 'activity') {
      setActiveTab('activity');
    } else {
      setActiveTab('skipper');
    }
  };

  const handleSelectTab = (tab: BottomNavTab) => {
    setActiveTab(tab);
    if (tab === 'skipper') setSelectedCategory('all');
    if (tab === 'activity') setSelectedCategory('stats');
    if (tab === 'readiness') setSelectedCategory('readiness');
  };

  // Determine what components to show based on selected category / active tab
  const isLibraryTab = activeTab === 'library';
  const showHero = !isLibraryTab && (activeTab === 'skipper' || selectedCategory === 'all');
  const showReadiness =
    !isLibraryTab &&
    (activeTab === 'readiness' ||
      selectedCategory === 'all' ||
      selectedCategory === 'readiness');
  const showStats =
    !isLibraryTab &&
    (activeTab === 'activity' ||
      selectedCategory === 'all' ||
      selectedCategory === 'stats');
  const showHistory =
    !isLibraryTab &&
    (activeTab === 'activity' ||
      selectedCategory === 'all' ||
      selectedCategory === 'activity');

  return (
    <View style={[styles.mainWrapper, { backgroundColor: theme.background }]}>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={theme.background}
      />

      {/* Header with time-of-day greeting, editorial title and status pill */}
      <Header
        theme={theme}
        isDark={isDark}
        isActive={isEnabled && serviceRunning}
        onToggleTheme={handleToggleTheme}
        onOpenGuide={() => setGuideVisible(true)}
        onOpenSettings={() => setSettingsVisible(true)}
      />

      {/* Main Content Area */}
      {isLibraryTab ? (
        <View style={styles.scrollArea}>
          <ListenedLibrary
            theme={theme}
            tracks={listenedTracks}
            stats={listenedStats}
            activePlayback={activePlayback}
            onDeleteTrack={handleDeleteListenedTrack}
            onClearAll={handleClearListenedTracks}
          />
        </View>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Hero Card inspired by the reference "Unwind" card */}
          {showHero && (
            <HeroCard
              theme={theme}
              isEnabled={isEnabled}
              onTogglePower={handleTogglePower}
              onOpenSpotify={handleOpenSpotify}
              isSpotifyInstalled={spotifyInstalled}
              track={currentTrack}
              artist={currentArtist}
              album={currentAlbum}
              isPlaying={isPlaying}
              isAd={isAd}
              isSkippingInProgress={isSkipping}
            />
          )}

          {/* Section Filter Pills inspired by "Choose an intent" */}
          <CategoryPills
            theme={theme}
            isDark={isDark}
            selectedCategory={selectedCategory}
            onSelectCategory={handleSelectCategory}
          />

          {/* System Readiness Checklist */}
          {showReadiness && (
            <ServiceStatusList
              theme={theme}
              isServiceRunning={serviceRunning}
              isNotificationGranted={notificationGranted}
              isAccessibilityGranted={accessibilityGranted}
              isBatteryOptimized={batteryOptimized}
              onToggleService={handleToggleService}
              onRequestNotificationAccess={openNotificationAccessSettings}
              onRequestAccessibility={openAccessibilitySettings}
              onRequestBatteryExemption={requestIgnoreBatteryOptimizations}
              onOpenBroadcastGuide={() => setGuideVisible(true)}
            />
          )}

          {/* Stats & Loophole Testing */}
          {showStats && (
            <StatsOverview
              theme={theme}
              totalSkipped={totalSkipped}
              totalSecondsSaved={totalSecondsSaved}
              onTestLoophole={handleTestLoophole}
              isSkipping={isSkipping}
            />
          )}

          {/* Activity History Feed */}
          {showHistory && (
            <HistoryList
              theme={theme}
              history={history}
              onClearHistory={handleClearHistory}
            />
          )}
        </ScrollView>
      )}

      {/* Minimalist Bottom Navigation Bar (like "Library" and "Progress" in reference image) */}
      <BottomNav
        theme={theme}
        activeTab={activeTab}
        onSelectTab={handleSelectTab}
      />

      {/* Modals with proper safe insets */}
      <SetupGuideModal
        theme={theme}
        visible={guideVisible}
        onClose={() => setGuideVisible(false)}
        onOpenSpotifySettings={openSpotifySettings}
        onOpenNotificationSettings={openNotificationAccessSettings}
        onOpenAccessibilitySettings={openAccessibilitySettings}
        onRequestBatteryExemption={requestIgnoreBatteryOptimizations}
      />

      <SettingsModal
        theme={theme}
        visible={settingsVisible}
        config={config}
        onClose={() => setSettingsVisible(false)}
        onSaveConfig={handleSaveConfig}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  mainWrapper: {
    flex: 1,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 28,
  },
});
