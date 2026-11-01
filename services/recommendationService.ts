import AsyncStorage from '@react-native-async-storage/async-storage';
import { ListenedTrack } from '../storage/listenedTracksStorage';

export interface RecommendationItem {
  id: string;
  title: string;
  artist: string;
  album?: string;
  matchScore: number; // 0 to 100
  seedReason: string;
  seedType: 'track' | 'artist' | 'curated';
  artworkUrl?: string;
  durationSec?: number;
  downloadStatus?: 'idle' | 'queued' | 'downloading' | 'downloaded' | 'failed';
  localFilePath?: string;
  progress?: number;
}

export interface RecommendationSeed {
  id: string;
  label: string;
  type: 'all' | 'track' | 'artist';
  title?: string;
  artist?: string;
}

const STORAGE_KEY_CACHE = 'SP_RECOMMENDATIONS_CACHE_V2';
const STORAGE_KEY_TIMESTAMP = 'SP_RECOMMENDATIONS_TIMESTAMP_V2';
const STORAGE_KEY_API_KEY = 'SP_LASTFM_CUSTOM_API_KEY_V1';

// User's personal Last.fm API key
const DEFAULT_LASTFM_KEY = 'b4cd35cc4464cd37c06e91457d5e97c7';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// Curated seeds to ensure the discovery page is never empty even for fresh installs
const CURATED_BACKUP_SEEDS = [
  { title: 'Blinding Lights', artist: 'The Weeknd' },
  { title: 'Starboy', artist: 'The Weeknd' },
  { title: 'Get Lucky', artist: 'Daft Punk' },
  { title: 'Bohemian Rhapsody', artist: 'Queen' },
  { title: 'As It Was', artist: 'Harry Styles' },
  { title: 'Levitating', artist: 'Dua Lipa' },
];

export async function getCustomLastFmApiKey(): Promise<string> {
  try {
    const key = await AsyncStorage.getItem(STORAGE_KEY_API_KEY);
    return key || '';
  } catch {
    return '';
  }
}

export async function saveCustomLastFmApiKey(key: string): Promise<void> {
  try {
    if (key.trim()) {
      await AsyncStorage.setItem(STORAGE_KEY_API_KEY, key.trim());
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY_API_KEY);
    }
  } catch (e) {
    console.warn('Error saving Last.fm API key', e);
  }
}

export async function clearRecommendationsCache(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEY_CACHE),
      AsyncStorage.removeItem(STORAGE_KEY_TIMESTAMP),
    ]);
  } catch (e) {
    console.warn('Error clearing recommendation cache', e);
  }
}

function cleanTrackTitle(title: string): string {
  return title
    .replace(/\s*\(feat\..*?\)/gi, '')
    .replace(/\s*\[feat\..*?\]/gi, '')
    .replace(/\s*\(with\..*?\)/gi, '')
    .replace(/\s*-\s*feat\..*$/gi, '')
    .replace(/\s*-\s*with\..*$/gi, '')
    .replace(/\s*-\s*.*remaster.*$/gi, '')
    .replace(/\s*-\s*live.*$/gi, '')
    .replace(/\s*-\s*radio edit.*$/gi, '')
    .trim();
}

function cleanArtistName(artist: string): string {
  if (artist.includes(',')) {
    return artist.split(',')[0].trim();
  }
  return artist.trim();
}

/**
 * Extracts the best seed tracks and artists from user's listening history
 */
export function extractSeeds(
  history: ListenedTrack[],
  randomize: boolean = false
): {
  seedTracks: { title: string; artist: string; reason: string }[];
  seedArtists: { artist: string; reason: string }[];
  filterSeeds: RecommendationSeed[];
} {
  const filterSeeds: RecommendationSeed[] = [
    { id: 'all', label: 'All Discoveries', type: 'all' },
  ];

  if (!history || history.length === 0) {
    const curatedPool = [...CURATED_BACKUP_SEEDS];
    if (randomize) {
      curatedPool.sort(() => Math.random() - 0.5);
    }
    return {
      seedTracks: curatedPool.slice(0, 3).map((s) => ({
        ...s,
        reason: 'Curated popular music',
      })),
      seedArtists: [],
      filterSeeds,
    };
  }

  // Score tracks: plays * 2 + minutes listened
  const scoredTracks = [...history].sort((a, b) => {
    const scoreA = (a.listenCount || 1) * 2 + (a.totalDurationListenedMs || 0) / 60000;
    const scoreB = (b.listenCount || 1) * 2 + (b.totalDurationListenedMs || 0) / 60000;
    return scoreB - scoreA;
  });

  let chosenTracks: ListenedTrack[] = [];
  if (randomize && scoredTracks.length > 3) {
    // Pick top track plus 2 random picks from the rest of history for fresh variety
    chosenTracks = [
      scoredTracks[0],
      ...scoredTracks.slice(1).sort(() => Math.random() - 0.5).slice(0, 2),
    ];
  } else {
    chosenTracks = scoredTracks.slice(0, 3);
  }

  const topTracks = chosenTracks.map((t) => ({
    title: t.title,
    artist: t.artist,
    reason: `Based on '${t.title}' (${t.listenCount} play${t.listenCount > 1 ? 's' : ''})`,
  }));

  // Add top tracks to filter seeds
  topTracks.forEach((t, i) => {
    filterSeeds.push({
      id: `track-${i}`,
      label: t.title.length > 18 ? `${t.title.substring(0, 18)}...` : t.title,
      type: 'track',
      title: t.title,
      artist: t.artist,
    });
  });

  // Aggregate artists
  const artistMap = new Map<string, number>();
  history.forEach((t) => {
    const cleanArt = cleanArtistName(t.artist);
    const current = artistMap.get(cleanArt) || 0;
    artistMap.set(cleanArt, current + (t.listenCount || 1));
  });

  const sortedArtists = Array.from(artistMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, randomize ? 4 : 2);

  const selectedArtists = randomize && sortedArtists.length > 2
    ? [sortedArtists[0], ...sortedArtists.slice(1).sort(() => Math.random() - 0.5).slice(0, 1)]
    : sortedArtists.slice(0, 2);

  const seedArtists = selectedArtists.map(([artist, plays]) => ({
    artist,
    reason: `Because you listen to ${artist} (${plays} play${plays > 1 ? 's' : ''})`,
  }));

  seedArtists.forEach((a, i) => {
    filterSeeds.push({
      id: `artist-${i}`,
      label: a.artist,
      type: 'artist',
      artist: a.artist,
    });
  });

  return { seedTracks: topTracks, seedArtists, filterSeeds };
}

/**
 * Fetches similar tracks from Last.fm API
 */
async function fetchLastFmSimilar(
  track: string,
  artist: string,
  apiKey: string,
  reason: string,
  limit: number = 10
): Promise<RecommendationItem[]> {
  try {
    const queryTrack = async (t: string, a: string) => {
      const url = `https://ws.audioscrobbler.com/2.0/?method=track.getsimilar&artist=${encodeURIComponent(
        a
      )}&track=${encodeURIComponent(t)}&api_key=${apiKey}&format=json&limit=${limit}`;
      const res = await fetch(url, { headers: { 'User-Agent': 'SpotifyAdSkipperMobile/1.0' } });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data?.similartracks?.track) ? data.similartracks.track : [];
    };

    let tracksList = await queryTrack(track, artist);
    // If not found (e.g. error 6 or empty), retry with cleaned title & artist
    if (tracksList.length === 0) {
      const cleanedT = cleanTrackTitle(track);
      const cleanedA = cleanArtistName(artist);
      if (cleanedT !== track || cleanedA !== artist) {
        tracksList = await queryTrack(cleanedT, cleanedA);
      }
    }

    if (!Array.isArray(tracksList) || tracksList.length === 0) {
      // If still empty, fall back to artist top tracks
      return fetchLastFmArtistTop(cleanArtistName(artist), apiKey, reason, 5);
    }

    return tracksList.map((item: any, idx: number) => {
      const matchRaw = parseFloat(item.match || '0');
      const score = Math.min(99, Math.max(65, Math.round(matchRaw * 100)));
      const img = Array.isArray(item.image)
        ? item.image.find((i: any) => i.size === 'medium' || i.size === 'large')?.['#text']
        : undefined;

      return {
        id: `lfm-${artist}-${track}-${idx}-${item.name}`,
        title: item.name,
        artist: typeof item.artist === 'object' ? item.artist.name : item.artist || 'Unknown',
        matchScore: score,
        seedReason: reason,
        seedType: 'track',
        artworkUrl: img || undefined,
        durationSec: parseInt(item.duration, 10) || undefined,
      };
    });
  } catch (e) {
    console.warn('Last.fm similar track fetch failed', e);
    return [];
  }
}

/**
 * Fetches top tracks for an artist from Last.fm
 */
async function fetchLastFmArtistTop(
  artist: string,
  apiKey: string,
  reason: string,
  limit: number = 6
): Promise<RecommendationItem[]> {
  try {
    const cleanArt = cleanArtistName(artist);
    const url = `https://ws.audioscrobbler.com/2.0/?method=artist.gettoptracks&artist=${encodeURIComponent(
      cleanArt
    )}&api_key=${apiKey}&format=json&limit=${limit}`;

    const res = await fetch(url, { headers: { 'User-Agent': 'SpotifyAdSkipperMobile/1.0' } });
    if (!res.ok) return [];

    const data = await res.json();
    const tracksList = data?.toptracks?.track;
    if (!Array.isArray(tracksList)) return [];

    return tracksList.map((item: any, idx: number) => {
      const img = Array.isArray(item.image)
        ? item.image.find((i: any) => i.size === 'medium' || i.size === 'large')?.['#text']
        : undefined;

      return {
        id: `lfm-top-${cleanArt}-${idx}-${item.name}`,
        title: item.name,
        artist: typeof item.artist === 'object' ? item.artist.name : item.artist || cleanArt,
        matchScore: Math.round(88 - idx * 2),
        seedReason: reason,
        seedType: 'artist',
        artworkUrl: img || undefined,
      };
    });
  } catch (e) {
    console.warn('Last.fm artist top tracks fetch failed', e);
    return [];
  }
}

async function fetchItunesFallback(
  artist: string,
  reason: string,
  limit: number = 6
): Promise<RecommendationItem[]> {
  try {
    const cleanArt = cleanArtistName(artist);
    const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
      cleanArt
    )}&entity=song&limit=${limit}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    if (!Array.isArray(data?.results)) return [];

    return data.results.map((r: any, idx: number) => ({
      id: `itunes-${r.trackId || idx}`,
      title: r.trackName,
      artist: r.artistName,
      album: r.collectionName,
      matchScore: Math.round(92 - idx * 3),
      seedReason: reason,
      seedType: 'artist' as const,
      artworkUrl: r.artworkUrl100 || r.artworkUrl60,
      durationSec: r.trackTimeMillis ? Math.round(r.trackTimeMillis / 1000) : undefined,
    }));
  } catch {
    return [];
  }
}

/**
 * Main function to get fresh recommendations based on user's listened history
 */
export async function getRecommendations(
  history: ListenedTrack[],
  forceRefresh: boolean = false
): Promise<{ recommendations: RecommendationItem[]; filterSeeds: RecommendationSeed[] }> {
  const { seedTracks, seedArtists, filterSeeds } = extractSeeds(history, forceRefresh);

  // Check cache first if not forced
  if (!forceRefresh) {
    try {
      const [cachedJson, timestampStr] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEY_CACHE),
        AsyncStorage.getItem(STORAGE_KEY_TIMESTAMP),
      ]);

      if (cachedJson && timestampStr) {
        const timestamp = parseInt(timestampStr, 10);
        if (Date.now() - timestamp < CACHE_TTL_MS) {
          const cached = JSON.parse(cachedJson) as RecommendationItem[];
          if (cached && cached.length > 0) {
            // Re-sync with current download statuses from history
            const synced = syncDownloadStatus(cached, history);
            return { recommendations: synced, filterSeeds };
          }
        }
      }
    } catch (e) {
      console.warn('Failed reading recommendation cache', e);
    }
  }

  // Resolve API key
  const customKey = await getCustomLastFmApiKey();
  const apiKey = customKey || DEFAULT_LASTFM_KEY;

  // Run queries in parallel
  const promises: Promise<RecommendationItem[]>[] = [];

  for (const seed of seedTracks) {
    promises.push(fetchLastFmSimilar(seed.title, seed.artist, apiKey, seed.reason, 10));
  }

  for (const seed of seedArtists) {
    promises.push(fetchLastFmArtistTop(seed.artist, apiKey, seed.reason, 6));
  }

  const results = await Promise.all(promises);
  let combined = results.flat();

  // If Last.fm returned nothing (e.g. rate limit or network issue), use iTunes fallback
  if (combined.length === 0) {
    const fallbackPromises: Promise<RecommendationItem[]>[] = [];
    for (const seed of seedArtists) {
      fallbackPromises.push(fetchItunesFallback(seed.artist, seed.reason, 6));
    }
    if (seedArtists.length === 0) {
      for (const seed of seedTracks) {
        fallbackPromises.push(fetchItunesFallback(seed.artist, seed.reason, 6));
      }
    }
    const fallbackResults = await Promise.all(fallbackPromises);
    combined = fallbackResults.flat();
  }

  // Deduplicate against already listened tracks in user's library
  const listenedKeys = new Set(
    history.map((t) => `${t.title.trim().toLowerCase()}-${t.artist.trim().toLowerCase()}`)
  );

  const seenKeys = new Set<string>();
  const deduplicated: RecommendationItem[] = [];

  for (const item of combined) {
    const key = `${item.title.trim().toLowerCase()}-${item.artist.trim().toLowerCase()}`;
    // Don't show if already in user history, unless combined would be empty
    if (!listenedKeys.has(key) && !seenKeys.has(key)) {
      seenKeys.add(key);
      deduplicated.push(item);
    }
  }

  // Fallback: If deduplication removed everything, keep combined
  const finalItems = deduplicated.length > 0 ? deduplicated : combined;

  // Sort by matchScore descending
  finalItems.sort((a, b) => b.matchScore - a.matchScore);

  // Sync download status from history
  const synced = syncDownloadStatus(finalItems, history);

  // Cache results only when we have valid items
  if (synced.length > 0) {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CACHE, JSON.stringify(synced));
      await AsyncStorage.setItem(STORAGE_KEY_TIMESTAMP, Date.now().toString());
    } catch (e) {
      console.warn('Failed saving recommendation cache', e);
    }
  }

  return { recommendations: synced, filterSeeds };
}

/**
 * Checks if any recommended songs have already been downloaded to device storage
 */
export function syncDownloadStatus(
  recommendations: RecommendationItem[],
  history: ListenedTrack[]
): RecommendationItem[] {
  const downloadedMap = new Map<string, ListenedTrack>();

  history.forEach((t) => {
    const key = `${t.title.trim().toLowerCase()}-${t.artist.trim().toLowerCase()}`;
    downloadedMap.set(key, t);
  });

  return recommendations.map((item) => {
    const key = `${item.title.trim().toLowerCase()}-${item.artist.trim().toLowerCase()}`;
    const matched = downloadedMap.get(key);

    if (matched) {
      return {
        ...item,
        downloadStatus: matched.downloadStatus || 'idle',
        localFilePath: matched.localFilePath,
        progress: matched.progress,
      };
    }
    return item;
  });
}
