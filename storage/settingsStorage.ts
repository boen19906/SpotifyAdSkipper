import AsyncStorage from '@react-native-async-storage/async-storage';
import { SkipperConfig } from '../modules/spotify-ad-skipper';

const STORAGE_KEY_DARK_MODE = '@spotify_ad_skip_dark_mode';
const STORAGE_KEY_CONFIG = '@spotify_ad_skip_config';

/**
 * Retrieve saved dark mode preference.
 * Returns boolean if set, or null if no preference has been saved yet.
 */
export async function getStoredTheme(): Promise<boolean | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_DARK_MODE);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading dark mode setting from storage', e);
  }
  return null;
}

/**
 * Save dark mode preference to persistent storage.
 */
export async function saveStoredTheme(isDark: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_DARK_MODE, JSON.stringify(isDark));
  } catch (e) {
    console.error('Error saving dark mode setting to storage', e);
  }
}

/**
 * Retrieve saved skipper configuration (delays, autoMute, isEnabled).
 */
export async function getStoredConfig(): Promise<Partial<SkipperConfig> | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_CONFIG);
    if (raw !== null) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading config from storage', e);
  }
  return null;
}

/**
 * Save skipper configuration to persistent storage.
 */
export async function saveStoredConfig(config: Partial<SkipperConfig>): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  } catch (e) {
    console.error('Error saving config to storage', e);
  }
}
