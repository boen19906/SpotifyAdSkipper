import type { EventSubscription } from 'expo-modules-core';
import SpotifyAdSkipperModule from './src/SpotifyAdSkipperModule';
import {
  AdDetectedPayload,
  AdSkippedPayload,
  MetadataChangedPayload,
  SkipperConfig,
} from './src/SpotifyAdSkipper.types';

export * from './src/SpotifyAdSkipper.types';

export type Subscription = EventSubscription;

export function isAvailable(): boolean {
  return !!SpotifyAdSkipperModule;
}

export function isServiceRunning(): boolean {
  try {
    return SpotifyAdSkipperModule?.isServiceRunning() ?? false;
  } catch {
    return false;
  }
}

export function startForegroundService(): boolean {
  try {
    return SpotifyAdSkipperModule?.startForegroundService() ?? false;
  } catch (e) {
    console.error('Failed to start foreground service', e);
    return false;
  }
}

export function stopForegroundService(): boolean {
  try {
    return SpotifyAdSkipperModule?.stopForegroundService() ?? false;
  } catch (e) {
    console.error('Failed to stop foreground service', e);
    return false;
  }
}

export function isNotificationAccessGranted(): boolean {
  try {
    return SpotifyAdSkipperModule?.isNotificationAccessGranted() ?? false;
  } catch {
    return false;
  }
}

export function openNotificationAccessSettings(): boolean {
  try {
    return SpotifyAdSkipperModule?.openNotificationAccessSettings() ?? false;
  } catch {
    return false;
  }
}

export function isAccessibilityServiceEnabled(): boolean {
  try {
    return SpotifyAdSkipperModule?.isAccessibilityServiceEnabled() ?? false;
  } catch {
    return false;
  }
}

export function openAccessibilitySettings(): boolean {
  try {
    return SpotifyAdSkipperModule?.openAccessibilitySettings() ?? false;
  } catch {
    return false;
  }
}

export function isIgnoringBatteryOptimizations(): boolean {
  try {
    return SpotifyAdSkipperModule?.isIgnoringBatteryOptimizations() ?? false;
  } catch {
    return false;
  }
}

export function requestIgnoreBatteryOptimizations(): boolean {
  try {
    return SpotifyAdSkipperModule?.requestIgnoreBatteryOptimizations() ?? false;
  } catch {
    return false;
  }
}

export function isSpotifyInstalled(): boolean {
  try {
    return SpotifyAdSkipperModule?.isSpotifyInstalled() ?? false;
  } catch {
    return false;
  }
}

export function openSpotify(): boolean {
  try {
    return SpotifyAdSkipperModule?.openSpotify() ?? false;
  } catch {
    return false;
  }
}

export function openSpotifySettings(): boolean {
  try {
    return SpotifyAdSkipperModule?.openSpotifySettings() ?? false;
  } catch {
    return false;
  }
}

export function triggerTestSkip(testTitle: string = 'Test Advertisement'): boolean {
  try {
    return SpotifyAdSkipperModule?.triggerTestSkip(testTitle) ?? false;
  } catch {
    return false;
  }
}

export function setConfig(
  enabled: boolean,
  autoMute: boolean,
  restartDelayMs: number,
  relaunchWaitMs: number
): boolean {
  try {
    return (
      SpotifyAdSkipperModule?.setConfig(
        enabled,
        autoMute,
        restartDelayMs,
        relaunchWaitMs
      ) ?? false
    );
  } catch {
    return false;
  }
}

export function getConfig(): SkipperConfig {
  try {
    return (
      SpotifyAdSkipperModule?.getConfig() ?? {
        isEnabled: true,
        autoMute: true,
        restartDelayMs: 800,
        relaunchWaitMs: 2500,
        skipCount: 0,
      }
    );
  } catch {
    return {
      isEnabled: true,
      autoMute: true,
      restartDelayMs: 800,
      relaunchWaitMs: 2500,
      skipCount: 0,
    };
  }
}

export function getSkipCount(): number {
  try {
    return SpotifyAdSkipperModule?.getSkipCount() ?? 0;
  } catch {
    return 0;
  }
}

export function addAdDetectedListener(
  listener: (event: AdDetectedPayload) => void
): EventSubscription {
  try {
    if (SpotifyAdSkipperModule && typeof SpotifyAdSkipperModule.addListener === 'function') {
      return SpotifyAdSkipperModule.addListener('onAdDetected', listener);
    }
  } catch (e) {
    console.warn('Could not attach addAdDetectedListener', e);
  }
  return { remove: () => {} };
}

export function addAdSkippedListener(
  listener: (event: AdSkippedPayload) => void
): EventSubscription {
  try {
    if (SpotifyAdSkipperModule && typeof SpotifyAdSkipperModule.addListener === 'function') {
      return SpotifyAdSkipperModule.addListener('onAdSkipped', listener);
    }
  } catch (e) {
    console.warn('Could not attach addAdSkippedListener', e);
  }
  return { remove: () => {} };
}

export function addMetadataChangedListener(
  listener: (event: MetadataChangedPayload) => void
): EventSubscription {
  try {
    if (SpotifyAdSkipperModule && typeof SpotifyAdSkipperModule.addListener === 'function') {
      return SpotifyAdSkipperModule.addListener('onMetadataChanged', listener);
    }
  } catch (e) {
    console.warn('Could not attach addMetadataChangedListener', e);
  }
  return { remove: () => {} };
}

export function getNativeListenedTracks(): any[] {
  try {
    return SpotifyAdSkipperModule?.getListenedTracks() ?? [];
  } catch {
    return [];
  }
}

export function saveNativeListenedTrack(trackData: any): boolean {
  try {
    return SpotifyAdSkipperModule?.saveListenedTrack(trackData) ?? false;
  } catch {
    return false;
  }
}

export function removeNativeListenedTrack(id: string): boolean {
  try {
    return SpotifyAdSkipperModule?.removeListenedTrack(id) ?? false;
  } catch {
    return false;
  }
}

export function clearNativeListenedTracks(): boolean {
  try {
    return SpotifyAdSkipperModule?.clearListenedTracks() ?? false;
  } catch {
    return false;
  }
}

export function addTrackCommittedListener(
  listener: (event: any) => void
): EventSubscription {
  try {
    if (SpotifyAdSkipperModule && typeof SpotifyAdSkipperModule.addListener === 'function') {
      return SpotifyAdSkipperModule.addListener('onTrackCommitted', listener);
    }
  } catch (e) {
    console.warn('Could not attach addTrackCommittedListener', e);
  }
  return { remove: () => {} };
}

export function isAutoDownloadEnabled(): boolean {
  try {
    return SpotifyAdSkipperModule?.isAutoDownloadEnabled() ?? true;
  } catch {
    return true;
  }
}

export function setAutoDownloadEnabled(enabled: boolean): boolean {
  try {
    return SpotifyAdSkipperModule?.setAutoDownloadEnabled(enabled) ?? false;
  } catch {
    return false;
  }
}

export function downloadTrack(
  title: string,
  artist: string,
  album: string,
  trackId: string,
  id?: string,
  durationMs?: number
): string {
  try {
    return SpotifyAdSkipperModule?.downloadTrack(title, artist, album, trackId, id, durationMs) ?? '';
  } catch (e) {
    console.error('Failed to trigger track download', e);
    return '';
  }
}

export function redownloadAllTracks(): boolean {
  try {
    return SpotifyAdSkipperModule?.redownloadAllTracks() ?? false;
  } catch (e) {
    console.error('Failed to trigger redownload of all tracks', e);
    return false;
  }
}

export function getMusicDownloadDirectory(): string {
  try {
    return SpotifyAdSkipperModule?.getMusicDownloadDirectory() ?? '';
  } catch {
    return '';
  }
}

export function addDownloadStatusChangedListener(
  listener: (event: import('./src/SpotifyAdSkipper.types').DownloadStatusChangedPayload) => void
): EventSubscription {
  try {
    if (SpotifyAdSkipperModule && typeof SpotifyAdSkipperModule.addListener === 'function') {
      return SpotifyAdSkipperModule.addListener('onDownloadStatusChanged', listener);
    }
  } catch (e) {
    console.warn('Could not attach addDownloadStatusChangedListener', e);
  }
  return { remove: () => {} };
}

export function playLocalTrack(filePath: string, title: string, artist: string): boolean {
  try {
    return SpotifyAdSkipperModule?.playLocalTrack(filePath, title, artist) ?? false;
  } catch (e) {
    console.error('Failed to play local track', e);
    return false;
  }
}

export function pauseLocalTrack(): boolean {
  try {
    return SpotifyAdSkipperModule?.pauseLocalTrack() ?? false;
  } catch (e) {
    console.error('Failed to pause local track', e);
    return false;
  }
}

export function resumeLocalTrack(): boolean {
  try {
    return SpotifyAdSkipperModule?.resumeLocalTrack() ?? false;
  } catch (e) {
    console.error('Failed to resume local track', e);
    return false;
  }
}

export function seekLocalTrack(positionMs: number): boolean {
  try {
    return SpotifyAdSkipperModule?.seekLocalTrack(positionMs) ?? false;
  } catch (e) {
    console.error('Failed to seek local track', e);
    return false;
  }
}

export function stopLocalTrack(): boolean {
  try {
    return SpotifyAdSkipperModule?.stopLocalTrack() ?? false;
  } catch (e) {
    console.error('Failed to stop local track', e);
    return false;
  }
}

export function getLocalPlayerState(): import('./src/SpotifyAdSkipper.types').LocalPlayerState {
  try {
    return (
      SpotifyAdSkipperModule?.getLocalPlayerState() ?? {
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        title: '',
        artist: '',
        filePath: '',
      }
    );
  } catch {
    return {
      isPlaying: false,
      positionMs: 0,
      durationMs: 0,
      title: '',
      artist: '',
      filePath: '',
    };
  }
}

export function addLocalPlayerStateListener(
  listener: (event: import('./src/SpotifyAdSkipper.types').LocalPlayerState) => void
): EventSubscription {
  try {
    if (SpotifyAdSkipperModule && typeof SpotifyAdSkipperModule.addListener === 'function') {
      return SpotifyAdSkipperModule.addListener('onLocalPlayerStateChanged', listener);
    }
  } catch (e) {
    console.warn('Could not attach addLocalPlayerStateListener', e);
  }
  return { remove: () => {} };
}

export function addLocalPlayerCompletedListener(
  listener: () => void
): EventSubscription {
  try {
    if (SpotifyAdSkipperModule && typeof SpotifyAdSkipperModule.addListener === 'function') {
      return SpotifyAdSkipperModule.addListener('onLocalPlayerCompleted', listener);
    }
  } catch (e) {
    console.warn('Could not attach addLocalPlayerCompletedListener', e);
  }
  return { remove: () => {} };
}


