import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  addMetadataChangedListener,
  addTrackCommittedListener,
  MetadataChangedPayload,
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

    return () => {
      appStateSub.remove();
      commitSub.remove();
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

  return {
    listenedTracks,
    stats,
    activePlayback,
    deleteTrack,
    clearAll,
    refreshTracks: loadInitialData,
  };
}
