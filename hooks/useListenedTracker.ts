import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  addMetadataChangedListener,
  addTrackCommittedListener,
  addDownloadStatusChangedListener,
  downloadTrack,
  isAutoDownloadEnabled,
  setAutoDownloadEnabled,
  getMusicDownloadDirectory,
  MetadataChangedPayload,
  DownloadStatusChangedPayload,
} from '../modules/spotify-ad-skipper';
import {
  clearListenedTracks,
  getListenedStats,
  getListenedTracks,
  ListenedStats,
  ListenedTrack,
  removeListenedTrack,
  saveListenedTrack,
} from '../storage/listenedTracksStorage';

interface ActiveSession {
  title: string;
  artist: string;
  album: string;
  trackId?: string;
  durationMs: number;
  accumulatedMs: number;
  lastResumeTime: number;
  isPlaying: boolean;
  hasCommitted: boolean;
}

export function useListenedTracker() {
  const [listenedTracks, setListenedTracks] = useState<ListenedTrack[]>([]);
  const [autoDownload, setAutoDownload] = useState<boolean>(true);
  const [musicDir, setMusicDir] = useState<string>('');
  const [stats, setStats] = useState<ListenedStats>({
    totalListenedCount: 0,
    uniqueTracksCount: 0,
    totalMinutesListened: 0,
  });
  const [activePlayback, setActivePlayback] = useState<{
    track: string;
    artist: string;
    album: string;
    isPlaying: boolean;
    isAd: boolean;
    elapsedSeconds: number;
    durationMs: number;
  } | null>(null);

  const activeSessionRef = useRef<ActiveSession | null>(null);

  const loadInitialData = useCallback(async () => {
    try {
      const [tracks, loadedStats] = await Promise.all([
        getListenedTracks(),
        getListenedStats(),
      ]);
      setListenedTracks(tracks);
      setStats(loadedStats);
      setAutoDownload(isAutoDownloadEnabled());
      setMusicDir(getMusicDownloadDirectory());
    } catch (e) {
      console.warn('Error loading listened tracks history', e);
    }
  }, []);

  useEffect(() => {
    loadInitialData();

    // Whenever app is brought to foreground or screen unlocks, refresh from native & AsyncStorage
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        loadInitialData();
      }
    });

    // Native background service listener: fires immediately when a track is committed by background service
    const commitSub = addTrackCommittedListener(() => {
      loadInitialData();
    });

    // Real-time audio downloader listener
    const downloadSub = addDownloadStatusChangedListener((event: DownloadStatusChangedPayload) => {
      setListenedTracks((prev) =>
        prev.map((t) => {
          const isMatch =
            (event.id && t.id === event.id) ||
            (t.title.toLowerCase() === event.title.toLowerCase() &&
              t.artist.toLowerCase() === event.artist.toLowerCase());
          if (isMatch) {
            return {
              ...t,
              downloadStatus: event.status,
              progress: event.progress,
              localFilePath: event.filePath || t.localFilePath,
            };
          }
          return t;
        })
      );
    });

    return () => {
      appStateSub.remove();
      commitSub.remove();
      downloadSub.remove();
    };
  }, [loadInitialData]);

  // Periodic UI timer to increment the active playback counter strictly when playing
  useEffect(() => {
    const interval = setInterval(() => {
      const session = activeSessionRef.current;
      // If paused or no session, do NOT increment timer
      if (!session || !session.isPlaying) {
        return;
      }

      const now = Date.now();
      // Bound delta to max 1500ms so background sleep / Doze wake never jumps thousands of seconds
      const delta = Math.min(Math.max(now - session.lastResumeTime, 0), 1500);
      session.lastResumeTime = now;
      session.accumulatedMs += delta;

      // Cap accumulatedMs to song duration if known
      if (session.durationMs > 0 && session.accumulatedMs > session.durationMs) {
        session.accumulatedMs = session.durationMs;
      }

      const elapsedSec = Math.floor(session.accumulatedMs / 1000);

      setActivePlayback((prev) =>
        prev
          ? { ...prev, elapsedSeconds: elapsedSec, isPlaying: true }
          : {
              track: session.title,
              artist: session.artist,
              album: session.album,
              isPlaying: true,
              isAd: false,
              elapsedSeconds: elapsedSec,
              durationMs: session.durationMs,
            }
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Listen to native Spotify metadata changes for the live card UI
  useEffect(() => {
    const sub = addMetadataChangedListener((payload: MetadataChangedPayload) => {
      const cleanTrack = payload.track?.trim() || '';
      const cleanArtist = payload.artist?.trim() || '';
      const isAd = payload.isAd;
      const isPlaying = Boolean(payload.isPlaying);
      const playbackPos = payload.playbackPositionMs ?? 0;

      if (isAd || cleanTrack.length === 0 || cleanTrack.toLowerCase() === 'advertisement') {
        activeSessionRef.current = null;
        setActivePlayback(null);
        return;
      }

      const currentSession = activeSessionRef.current;
      const isSameTrack =
        currentSession &&
        currentSession.title.toLowerCase() === cleanTrack.toLowerCase() &&
        currentSession.artist.toLowerCase() === cleanArtist.toLowerCase();

      const now = Date.now();

      if (isSameTrack && currentSession) {
        // Sync to native OS playback position if provided and valid
        if (playbackPos > 0) {
          currentSession.accumulatedMs = playbackPos;
        }

        if (isPlaying && !currentSession.isPlaying) {
          currentSession.isPlaying = true;
          currentSession.lastResumeTime = now;
        } else if (!isPlaying && currentSession.isPlaying) {
          currentSession.isPlaying = false;
        } else if (isPlaying) {
          currentSession.lastResumeTime = now;
        }

        if (payload.durationMs && payload.durationMs > 0) {
          currentSession.durationMs = payload.durationMs;
        }
        if (currentSession.durationMs > 0 && currentSession.accumulatedMs > currentSession.durationMs) {
          currentSession.accumulatedMs = currentSession.durationMs;
        }

        setActivePlayback({
          track: cleanTrack,
          artist: cleanArtist,
          album: payload.album || currentSession.album,
          isPlaying,
          isAd: false,
          elapsedSeconds: Math.floor(currentSession.accumulatedMs / 1000),
          durationMs: currentSession.durationMs,
        });
      } else {
        // New track started
        const initialPos = playbackPos > 0 ? playbackPos : 0;
        activeSessionRef.current = {
          title: cleanTrack,
          artist: cleanArtist,
          album: payload.album || '',
          trackId: payload.trackId,
          durationMs: payload.durationMs || 0,
          accumulatedMs: initialPos,
          lastResumeTime: now,
          isPlaying,
          hasCommitted: false,
        };

        setActivePlayback({
          track: cleanTrack,
          artist: cleanArtist,
          album: payload.album || '',
          isPlaying,
          isAd: false,
          elapsedSeconds: Math.floor(initialPos / 1000),
          durationMs: payload.durationMs || 0,
        });
      }
    });

    return () => {
      sub.remove();
    };
  }, []);

  const deleteTrack = useCallback(async (id: string) => {
    const updated = await removeListenedTrack(id);
    setListenedTracks(updated);
    const newStats = await getListenedStats();
    setStats(newStats);
  }, []);

  const clearAll = useCallback(async () => {
    await clearListenedTracks();
    setListenedTracks([]);
    setStats({
      totalListenedCount: 0,
      uniqueTracksCount: 0,
      totalMinutesListened: 0,
    });
  }, []);

  const toggleAutoDownload = useCallback((enabled: boolean) => {
    setAutoDownloadEnabled(enabled);
    setAutoDownload(enabled);
  }, []);

  const downloadSong = useCallback(async (track: ListenedTrack) => {
    const cleanTitle = track.title.trim();
    const cleanArtist = track.artist.trim();

    const queuedTrack: ListenedTrack = {
      ...track,
      title: cleanTitle,
      artist: cleanArtist,
      album: track.album || 'Discoveries',
      downloadStatus: 'queued',
      progress: 0,
      lastListenedAt: track.lastListenedAt || Date.now(),
      firstListenedAt: track.firstListenedAt || Date.now(),
      listenCount: track.listenCount || 1,
      totalDurationListenedMs: track.totalDurationListenedMs || 30000,
    };

    setListenedTracks((prev) => {
      const exists = prev.some(
        (t) =>
          t.id === track.id ||
          (t.title.trim().toLowerCase() === cleanTitle.toLowerCase() &&
            t.artist.trim().toLowerCase() === cleanArtist.toLowerCase())
      );

      if (exists) {
        return prev.map((t) =>
          t.id === track.id ||
          (t.title.trim().toLowerCase() === cleanTitle.toLowerCase() &&
            t.artist.trim().toLowerCase() === cleanArtist.toLowerCase())
            ? { ...t, downloadStatus: 'queued', progress: 0 }
            : t
        );
      } else {
        return [queuedTrack, ...prev];
      }
    });

    try {
      await saveListenedTrack({
        title: cleanTitle,
        artist: cleanArtist,
        album: track.album || 'Discoveries',
        trackId: track.trackId || '',
        durationMs: track.durationMs || 180000,
        totalDurationListenedMs: track.totalDurationListenedMs || 30000,
      });
      const newStats = await getListenedStats();
      setStats(newStats);
    } catch (e) {
      console.warn('Error saving downloaded track to library', e);
    }

    downloadTrack(cleanTitle, cleanArtist, track.album || 'Discoveries', track.trackId || '', track.id, track.durationMs || 0);
  }, []);

  return {
    listenedTracks,
    stats,
    activePlayback,
    autoDownload,
    toggleAutoDownload,
    downloadSong,
    musicDir,
    deleteTrack,
    clearAll,
    refreshTracks: loadInitialData,
  };
}
