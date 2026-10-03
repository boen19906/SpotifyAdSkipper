import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SkipRecord {
  id: string;
  title: string;
  durationSavedSeconds: number;
  timestamp: number;
  source: 'auto' | 'test';
}

const STORAGE_KEY_HISTORY = '@spotify_ad_skip_history';
const STORAGE_KEY_STATS = '@spotify_ad_skip_stats';

export interface StoredStats {
  totalSkipped: number;
  totalSecondsSaved: number;
}

export async function getStoredStats(): Promise<StoredStats> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_STATS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading stats from storage', e);
  }
  return { totalSkipped: 0, totalSecondsSaved: 0 };
}

export async function saveSkipRecord(
  title: string,
  durationSavedSeconds: number = 30,
  source: 'auto' | 'test' = 'auto'
): Promise<{ stats: StoredStats; history: SkipRecord[] }> {
  try {
    const history = await getStoredHistory();
    const stats = await getStoredStats();

    const newRecord: SkipRecord = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title,
      durationSavedSeconds,
      timestamp: Date.now(),
      source,
    };

    const updatedHistory = [newRecord, ...history].slice(0, 50); // Keep last 50
    const updatedStats: StoredStats = {
      totalSkipped: stats.totalSkipped + 1,
      totalSecondsSaved: stats.totalSecondsSaved + durationSavedSeconds,
    };

    await Promise.all([
      AsyncStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(updatedHistory)),
      AsyncStorage.setItem(STORAGE_KEY_STATS, JSON.stringify(updatedStats)),
    ]);

    return { stats: updatedStats, history: updatedHistory };
  } catch (e) {
    console.error('Error saving skip record', e);
    return {
      stats: { totalSkipped: 0, totalSecondsSaved: 0 },
      history: [],
    };
  }
}

export async function getStoredHistory(): Promise<SkipRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_HISTORY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading history from storage', e);
  }
  return [];
}

export async function clearStoredHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY_HISTORY);
    await AsyncStorage.removeItem(STORAGE_KEY_STATS);
  } catch (e) {
    console.error('Error clearing history', e);
  }
}
