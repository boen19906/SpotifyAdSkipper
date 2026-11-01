import { NativeModule, requireNativeModule } from 'expo';
import {
  AdDetectedPayload,
  AdSkippedPayload,
  MetadataChangedPayload,
  SkipperConfig,
  TrackCommittedPayload,
  DownloadStatusChangedPayload,
  ListenedTrack,
  LocalPlayerState,
} from './SpotifyAdSkipper.types';

export type SpotifyAdSkipperEvents = {
  onAdDetected: (event: AdDetectedPayload) => void;
  onAdSkipped: (event: AdSkippedPayload) => void;
  onMetadataChanged: (event: MetadataChangedPayload) => void;
  onTrackCommitted: (event: TrackCommittedPayload) => void;
  onDownloadStatusChanged: (event: DownloadStatusChangedPayload) => void;
  onLocalPlayerStateChanged: (event: LocalPlayerState) => void;
  onLocalPlayerCompleted: (event: Record<string, never>) => void;
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
  getListenedTracks(): ListenedTrack[];
  saveListenedTrack(trackData: Record<string, any>): boolean;
  removeListenedTrack(id: string): boolean;
  clearListenedTracks(): boolean;
  isAutoDownloadEnabled(): boolean;
  setAutoDownloadEnabled(enabled: boolean): boolean;
  downloadTrack(title: string, artist: string, album: string, trackId: string, id?: string, durationMs?: number): string;
  redownloadAllTracks(): boolean;
  getMusicDownloadDirectory(): string;
  playLocalTrack(filePath: string, title: string, artist: string): boolean;
  pauseLocalTrack(): boolean;
  resumeLocalTrack(): boolean;
  seekLocalTrack(positionMs: number): boolean;
  stopLocalTrack(): boolean;
  getLocalPlayerState(): LocalPlayerState;
}

export default requireNativeModule<SpotifyAdSkipperNativeModule>('SpotifyAdSkipper');
