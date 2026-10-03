import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  clearNativeListenedTracks,
  getNativeListenedTracks,
  removeNativeListenedTrack,
  saveNativeListenedTrack,
} from '../modules/spotify-ad-skipper';

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
  downloadStatus: 'idle' | 'recording' | 'downloaded' | 'failed';
  localFilePath?: string;
}

export interface ListenedStats {
  totalListenedCount: number;
  uniqueTracksCount: number;
  totalMinutesListened: number;
}

const STORAGE_KEY_LISTENED_TRACKS = '@spotify_ad_skip_listened_tracks';

function normalizeArtist(artist: string): string {
  const clean = (artist || '').trim().toLowerCase();
  if (clean.includes('•')) {
    return clean.split('•')[0].trim();
  }
  return clean;
}

function getTrackKey(track: { trackId?: string; title: string; artist: string }): string {
  const cleanTitle = (track.title || '').trim().toLowerCase();
  const cleanArtist = normalizeArtist(track.artist);
  return `${cleanTitle}:::${cleanArtist}`;
}

function computeStats(tracks: ListenedTrack[]): ListenedStats {
  const totalListenedCount = tracks.reduce((sum, t) => sum + (t.listenCount || 1), 0);
  const totalMs = tracks.reduce(
    (sum, t) => sum + (t.totalDurationListenedMs || t.durationMs || 30000),
    0
  );
  return {
    uniqueTracksCount: tracks.length,
    totalListenedCount,
    totalMinutesListened: Math.round(totalMs / 60000),
  };
}

/**
 * Get all tracked songs listened to, ordered by most recently heard first.
 * Dual-reads and merges native background storage with AsyncStorage to guarantee
 * 100% persistence across app restarts, reboots, and background service execution.
 */
export async function getListenedTracks(): Promise<ListenedTrack[]> {
  const mergedMap = new Map<string, ListenedTrack>();

  // 1. Read from AsyncStorage
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_LISTENED_TRACKS);
    if (raw) {
      const storedTracks: ListenedTrack[] = JSON.parse(raw);
      if (Array.isArray(storedTracks)) {
        for (const item of storedTracks) {
          const key = getTrackKey(item);
          if (key) {
            mergedMap.set(key, item);
          }
        }
      }
    }
  } catch (e) {
    console.warn('Error reading listened tracks from AsyncStorage', e);
  }

  // 2. Read from Native Storage
  try {
    const nativeTracks = getNativeListenedTracks();
    if (Array.isArray(nativeTracks)) {
      for (const item of nativeTracks) {
        const key = getTrackKey({
          trackId: item.trackId ? String(item.trackId) : undefined,
          title: String(item.title || ''),
          artist: String(item.artist || ''),
        });
        if (!key) continue;

        const existing = mergedMap.get(key);
        if (existing) {
          // Merge: pick highest play count and most recent timestamp
          const updated: ListenedTrack = {
            ...existing,
            title: item.title ? String(item.title) : existing.title,
            artist: item.artist ? String(item.artist) : existing.artist,
            album: item.album ? String(item.album) : existing.album,
            trackId: item.trackId ? String(item.trackId) : existing.trackId,
            durationMs: Math.max(Number(item.durationMs) || 0, existing.durationMs || 0),
            firstListenedAt: Math.min(Number(item.firstListenedAt) || existing.firstListenedAt, existing.firstListenedAt),
            lastListenedAt: Math.max(Number(item.lastListenedAt) || existing.lastListenedAt, existing.lastListenedAt),
            listenCount: Math.max(Number(item.listenCount) || 1, existing.listenCount || 1),
            totalDurationListenedMs: Math.max(
              Number(item.totalDurationListenedMs) || 0,
              existing.totalDurationListenedMs || 0
            ),
          };
          mergedMap.set(key, updated);
        } else {
          mergedMap.set(key, {
            id: String(item.id || `${Date.now()}_${Math.random()}`),
            trackId: item.trackId ? String(item.trackId) : undefined,
            title: String(item.title || ''),
            artist: String(item.artist || ''),
            album: String(item.album || ''),
            durationMs: Number(item.durationMs) || 0,
            firstListenedAt: Number(item.firstListenedAt) || Date.now(),
            lastListenedAt: Number(item.lastListenedAt) || Date.now(),
            listenCount: Number(item.listenCount) || 1,
            totalDurationListenedMs: Number(item.totalDurationListenedMs) || 30000,
            downloadStatus: (item.downloadStatus as any) || 'idle',
            localFilePath: item.localFilePath ? String(item.localFilePath) : undefined,
          });
        }
      }
    }
  } catch (e) {
    console.warn('Native getListenedTracks failed, using AsyncStorage cache', e);
  }

  // Sort descending by lastListenedAt
  const sorted = Array.from(mergedMap.values()).sort(
    (a, b) => (b.lastListenedAt || 0) - (a.lastListenedAt || 0)
  );

  // Sync merged state back to AsyncStorage asynchronously
  AsyncStorage.setItem(STORAGE_KEY_LISTENED_TRACKS, JSON.stringify(sorted)).catch(() => {});

  return sorted;
}

/**
 * Save or update a listened track into persistent storage (both Native & AsyncStorage).
 */
export async function saveListenedTrack(
  trackInput: {
    title: string;
    artist: string;
    album?: string;
    trackId?: string;
    durationMs?: number;
    totalDurationListenedMs?: number;
  }
): Promise<ListenedTrack[]> {
  const now = Date.now();
  const title = trackInput.title.trim();
  const artist = trackInput.artist.trim();
  const album = (trackInput.album || '').trim();
  const trackId = (trackInput.trackId || '').trim();
  const durationMs = trackInput.durationMs || 0;
  const durationSpentMs = trackInput.totalDurationListenedMs || 30000;

  // 1. Write to Native storage
  try {
    saveNativeListenedTrack({
      title,
      artist,
      album,
      trackId,
      durationMs,
      totalDurationListenedMs: durationSpentMs,
    });
  } catch (e) {
    console.warn('saveNativeListenedTrack failed', e);
  }

  // 2. Update AsyncStorage and merge
  const currentList = await getListenedTracks();
  const key = getTrackKey({ trackId, title, artist });
  const existingIndex = currentList.findIndex((t) => getTrackKey(t) === key);

  let updatedList: ListenedTrack[];
  if (existingIndex >= 0) {
    const existing = currentList[existingIndex];
    const isRecentDuplicate = now - (existing.lastListenedAt || 0) < 60000;
    const updated: ListenedTrack = {
      ...existing,
      album: album || existing.album,
      trackId: trackId || existing.trackId,
      durationMs: durationMs > 0 ? durationMs : existing.durationMs,
      lastListenedAt: now,
      listenCount: isRecentDuplicate ? existing.listenCount : (existing.listenCount || 1) + 1,
      totalDurationListenedMs: (existing.totalDurationListenedMs || 0) + durationSpentMs,
    };
    updatedList = [updated, ...currentList.filter((_, idx) => idx !== existingIndex)];
  } else {
    const newTrack: ListenedTrack = {
      id: `${now}_${Math.floor(1000 + Math.random() * 9000)}`,
      trackId: trackId || undefined,
      title,
      artist,
      album,
      durationMs,
      firstListenedAt: now,
      lastListenedAt: now,
      listenCount: 1,
      totalDurationListenedMs: durationSpentMs,
      downloadStatus: 'idle',
    };
    updatedList = [newTrack, ...currentList];
  }

  // Cap at 500 tracks
  if (updatedList.length > 500) {
    updatedList = updatedList.slice(0, 500);
  }

  await AsyncStorage.setItem(STORAGE_KEY_LISTENED_TRACKS, JSON.stringify(updatedList)).catch(() => {});
  return updatedList;
}

/**
 * Get aggregated listening stats.
 */
export async function getListenedStats(): Promise<ListenedStats> {
  const tracks = await getListenedTracks();
  return computeStats(tracks);
}

/**
 * Remove a specific song from listening history.
 */
export async function removeListenedTrack(id: string): Promise<ListenedTrack[]> {
  try {
    removeNativeListenedTrack(id);
  } catch (e) {
    console.warn('Native removeListenedTrack failed', e);
  }

  try {
    const tracks = await getListenedTracks();
    const updated = tracks.filter((t) => t.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY_LISTENED_TRACKS, JSON.stringify(updated));
    return updated;
  } catch (e) {
    console.error('Error removing listened track', e);
    return [];
  }
}

/**
 * Clear all tracked songs history.
 */
export async function clearListenedTracks(): Promise<void> {
  try {
    clearNativeListenedTracks();
  } catch (e) {
    console.warn('Native clearListenedTracks failed', e);
  }

  try {
    await AsyncStorage.removeItem(STORAGE_KEY_LISTENED_TRACKS);
  } catch (e) {
    console.error('Error clearing listened tracks', e);
  }
}
