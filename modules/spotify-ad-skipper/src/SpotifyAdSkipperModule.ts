import { NativeModule, requireNativeModule } from 'expo';
import {
  AdDetectedPayload,
  AdSkippedPayload,
  MetadataChangedPayload,
  SkipperConfig,
} from './SpotifyAdSkipper.types';

export type SpotifyAdSkipperEvents = {
  onAdDetected: (event: AdDetectedPayload) => void;
  onAdSkipped: (event: AdSkippedPayload) => void;
  onMetadataChanged: (event: MetadataChangedPayload) => void;
};

declare class SpotifyAdSkipperNativeModule extends NativeModule<SpotifyAdSkipperEvents> {
  isServiceRunning(): boolean;
  startForegroundService(): boolean;
  stopForegroundService(): boolean;
  isNotificationAccessGranted(): boolean;
  openNotificationAccessSettings(): boolean;
  isAccessibilityServiceEnabled(): boolean;
  openAccessibilitySettings(): boolean;
  isIgnoringBatteryOptimizations(): boolean;
  requestIgnoreBatteryOptimizations(): boolean;
  isSpotifyInstalled(): boolean;
  openSpotify(): boolean;
  openSpotifySettings(): boolean;
  triggerTestSkip(testTitle: string): boolean;
  setConfig(enabled: boolean, autoMute: boolean, restartDelayMs: number, relaunchWaitMs: number): boolean;
  getConfig(): SkipperConfig;
  getSkipCount(): number;
}

export default requireNativeModule<SpotifyAdSkipperNativeModule>('SpotifyAdSkipper');
