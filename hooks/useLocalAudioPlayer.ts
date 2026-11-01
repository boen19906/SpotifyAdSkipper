import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
import {
  playLocalTrack,
  pauseLocalTrack,
  resumeLocalTrack,
  seekLocalTrack,
  stopLocalTrack,
  addLocalPlayerStateListener,
  addLocalPlayerCompletedListener,
} from '../modules/spotify-ad-skipper';
import { ListenedTrack } from '../storage/listenedTracksStorage';

export function useLocalAudioPlayer() {
  const [currentTrack, setCurrentTrack] = useState<ListenedTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [positionMs, setPositionMs] = useState<number>(0);
  const [durationMs, setDurationMs] = useState<number>(0);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [playlist, setPlaylist] = useState<ListenedTrack[]>([]);

  // Refs for current values to avoid stale closures in event listeners
  const currentTrackRef = useRef<ListenedTrack | null>(null);
  const isPlayingRef = useRef<boolean>(false);
  const playlistRef = useRef<ListenedTrack[]>([]);
  const isShuffleRef = useRef<boolean>(false);

  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    playlistRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    isShuffleRef.current = isShuffle;
  }, [isShuffle]);

  const playTrack = useCallback((track: ListenedTrack, trackList?: ListenedTrack[]) => {
    if (!track.localFilePath) {
      console.warn('Track has no local file path', track);
      return false;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const success = playLocalTrack(track.localFilePath, track.title, track.artist);
    if (success) {
      setCurrentTrack(track);
      setIsPlaying(true);
      setPositionMs(0);
      setDurationMs(track.durationMs || 0);

      if (trackList && trackList.length > 0) {
        setPlaylist(trackList);
      }
    }
    return success;
  }, []);

  const togglePlayPause = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isPlayingRef.current) {
      pauseLocalTrack();
      setIsPlaying(false);
    } else {
      if (currentTrackRef.current) {
        resumeLocalTrack();
        setIsPlaying(true);
      } else if (playlistRef.current.length > 0) {
        playTrack(playlistRef.current[0]);
      }
    }
  }, [playTrack]);

  const seekTo = useCallback((pos: number) => {
    seekLocalTrack(pos);
    setPositionMs(pos);
  }, []);

  const stop = useCallback(() => {
    stopLocalTrack();
    setIsPlaying(false);
    setCurrentTrack(null);
    setPositionMs(0);
  }, []);

  const nextTrack = useCallback(() => {
    const list = playlistRef.current;
    if (list.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    if (isShuffleRef.current) {
      // Pick a random track different from current if possible
      const available = list.filter((t) => t.id !== currentTrackRef.current?.id);
      const candidates = available.length > 0 ? available : list;
      const randomIndex = Math.floor(Math.random() * candidates.length);
      playTrack(candidates[randomIndex]);
    } else {
      // Sequential playback
      const currentIndex = list.findIndex((t) => t.id === currentTrackRef.current?.id);
      const nextIndex = currentIndex >= 0 ? (currentIndex + 1) % list.length : 0;
      playTrack(list[nextIndex]);
    }
  }, [playTrack]);

  const previousTrack = useCallback(() => {
    // If more than 3 seconds in, restart the song
    if (positionMs > 3000) {
      seekTo(0);
      return;
    }

    const list = playlistRef.current;
    if (list.length === 0) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const currentIndex = list.findIndex((t) => t.id === currentTrackRef.current?.id);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : list.length - 1;
    playTrack(list[prevIndex]);
  }, [positionMs, seekTo, playTrack]);

  const shufflePlay = useCallback(
    (downloadedTracks: ListenedTrack[]) => {
      const validTracks = downloadedTracks.filter(
        (t) => t.downloadStatus === 'downloaded' && !!t.localFilePath
      );
      if (validTracks.length === 0) return false;

      try {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      } catch {}

      // Enable shuffle
      setIsShuffle(true);
      isShuffleRef.current = true;

      // Pick a random track to start
      const randomIndex = Math.floor(Math.random() * validTracks.length);
      const chosen = validTracks[randomIndex];

      // Shuffle the list for subsequent plays
      const shuffled = [...validTracks].sort(() => Math.random() - 0.5);
      setPlaylist(shuffled);
      playlistRef.current = shuffled;

      return playTrack(chosen, shuffled);
    },
    [playTrack]
  );

  const toggleShuffle = useCallback(() => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsShuffle((prev) => !prev);
  }, []);

  // Listen to native player events
  useEffect(() => {
    const subState = addLocalPlayerStateListener((event) => {
      setIsPlaying(event.isPlaying);
      setPositionMs(event.positionMs);
      if (event.durationMs > 0) {
        setDurationMs(event.durationMs);
      }
    });

    const subComplete = addLocalPlayerCompletedListener(() => {
      // Auto advance to next song when playback completes
      nextTrack();
    });

    return () => {
      subState.remove();
      subComplete.remove();
    };
  }, [nextTrack]);

  return {
    currentTrack,
    isPlaying,
    positionMs,
    durationMs,
    isShuffle,
    playlist,
    playTrack,
    togglePlayPause,
    seekTo,
    nextTrack,
    previousTrack,
    shufflePlay,
    toggleShuffle,
    stop,
  };
}
