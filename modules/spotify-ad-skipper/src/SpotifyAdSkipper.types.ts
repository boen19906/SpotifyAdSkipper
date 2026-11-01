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

export interface DownloadStatusChangedPayload {
  id: string;
  trackId: string;
  title: string;
  artist: string;
  status: 'idle' | 'queued' | 'downloading' | 'downloaded' | 'failed';
  progress: number;
  filePath: string;
  error?: string;
}

export interface ListenedTrack {
  id: string;
  trackId?: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  firstListenedAt: number;
  lastListenedAt: number;
  listenCount: number;
  totalDurationListenedMs: number;
  downloadStatus?: 'idle' | 'queued' | 'downloading' | 'downloaded' | 'failed';
  localFilePath?: string;
  progress?: number;
}

export interface LocalPlayerState {
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  title: string;
  artist: string;
  filePath: string;
}

