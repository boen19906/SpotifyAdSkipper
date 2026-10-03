export interface AdDetectedPayload {
  title: string;
  artist: string;
}

export interface AdSkippedPayload {
  title: string;
  durationSavedSeconds: number;
  timestamp: number;
}

export interface TrackCommittedPayload {
  title: string;
  artist: string;
  album: string;
  trackId?: string;
  durationMs?: number;
}

export interface MetadataChangedPayload {
  track: string;
  artist: string;
  album: string;
  isPlaying: boolean;
  isAd: boolean;
  trackId?: string;
  durationMs?: number;
  playbackPositionMs?: number;
}

export interface SkipperConfig {
  isEnabled: boolean;
  autoMute: boolean;
  restartDelayMs: number;
  relaunchWaitMs: number;
  skipCount: number;
}
