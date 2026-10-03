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
