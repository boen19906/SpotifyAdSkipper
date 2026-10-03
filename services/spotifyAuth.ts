import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DiscoveryDocument,
  exchangeCodeAsync,
  makeRedirectUri,
  refreshAsync,
  TokenResponse,
} from 'expo-auth-session';

export const SPOTIFY_DISCOVERY: DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export const SPOTIFY_SCOPES = [
  'user-read-recently-played',
  'user-top-read',
  'user-library-read',
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
];

export const SPOTIFY_REDIRECT_URI = makeRedirectUri({
  scheme: 'spotifyadskip',
  path: 'auth',
});

const STORAGE_KEY_AUTH = '@spotify_ad_skip_spotify_auth';
const STORAGE_KEY_CLIENT_ID = '@spotify_ad_skip_spotify_client_id';

export interface SpotifyAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  issuedAt: number; // unix timestamp in seconds
  scope?: string;
}

export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyImage {
  url: string;
  height?: number;
  width?: number;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  albumName: string;
  albumImageUrl?: string;
  uri: string;
  durationMs: number;
}

export interface SpotifyUserProfile {
  id: string;
  displayName: string;
  imageUrl?: string;
  product?: string;
}

/**
 * Retrieve saved Spotify Client ID from storage.
 */
export async function getStoredClientId(): Promise<string> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEY_CLIENT_ID);
    return val?.trim() || '';
  } catch (e) {
    console.warn('Error reading Spotify Client ID from storage', e);
    return '';
  }
}

/**
 * Save Spotify Client ID to storage.
 */
export async function saveStoredClientId(clientId: string): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_CLIENT_ID, clientId.trim());
  } catch (e) {
    console.error('Error saving Spotify Client ID to storage', e);
  }
}

/**
 * Retrieve saved Spotify auth tokens from storage.
 */
export async function getStoredTokens(): Promise<SpotifyAuthTokens | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY_AUTH);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error reading Spotify auth tokens from storage', e);
  }
  return null;
}

/**
 * Save or clear Spotify auth tokens in storage.
 */
export async function saveStoredTokens(tokens: SpotifyAuthTokens | null): Promise<void> {
  try {
    if (tokens) {
      await AsyncStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(tokens));
    } else {
      await AsyncStorage.removeItem(STORAGE_KEY_AUTH);
    }
  } catch (e) {
    console.error('Error saving Spotify auth tokens', e);
  }
}

/**
 * Exchange auth code + PKCE code_verifier for tokens and persist them.
 */
export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  clientId: string
): Promise<SpotifyAuthTokens> {
  const tokenResponse = await exchangeCodeAsync(
    {
      clientId,
      code,
      redirectUri: SPOTIFY_REDIRECT_URI,
      extraParams: {
        code_verifier: codeVerifier,
      },
    },
    SPOTIFY_DISCOVERY
  );

  const tokens: SpotifyAuthTokens = {
    accessToken: tokenResponse.accessToken,
    refreshToken: tokenResponse.refreshToken,
    expiresIn: tokenResponse.expiresIn,
    issuedAt: tokenResponse.issuedAt,
    scope: tokenResponse.scope,
  };

  await saveStoredTokens(tokens);
  return tokens;
}

/**
 * Check if the token is valid or automatically refresh it if expired.
 */
export async function getValidAccessToken(): Promise<string | null> {
  const tokens = await getStoredTokens();
  if (!tokens || !tokens.accessToken) {
    return null;
  }

  const clientId = await getStoredClientId();
  if (!clientId) {
    return tokens.accessToken;
  }

  const isFresh = TokenResponse.isTokenFresh(
    {
      expiresIn: tokens.expiresIn,
      issuedAt: tokens.issuedAt,
    },
    -120 // 2-minute safety window
  );

  if (isFresh) {
    return tokens.accessToken;
  }

  // If token is expired, try refreshing
  if (tokens.refreshToken) {
    try {
      const refreshed = await refreshAsync(
        {
          clientId,
          refreshToken: tokens.refreshToken,
        },
        SPOTIFY_DISCOVERY
      );

      const updatedTokens: SpotifyAuthTokens = {
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken || tokens.refreshToken,
        expiresIn: refreshed.expiresIn,
        issuedAt: refreshed.issuedAt,
        scope: refreshed.scope || tokens.scope,
      };

      await saveStoredTokens(updatedTokens);
      return updatedTokens.accessToken;
    } catch (err) {
      console.warn('Failed to refresh Spotify access token', err);
    }
  }

  return tokens.accessToken;
}

/**
 * Sign out / clear tokens.
 */
export async function logoutSpotify(): Promise<void> {
  await saveStoredTokens(null);
}

// -------------------------------------------------------------
// Spotify Web API helper methods
// -------------------------------------------------------------

async function spotifyApiFetch(endpoint: string, options: RequestInit = {}): Promise<any> {
  const token = await getValidAccessToken();
  if (!token) {
    throw new Error('Not authenticated with Spotify');
  }

  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${errorText}`);
  }

  return res.json();
}

/**
 * Fetch current user profile.
 */
export async function fetchUserProfile(): Promise<SpotifyUserProfile> {
  const data = await spotifyApiFetch('/me');
  return {
    id: data.id,
    displayName: data.display_name || data.id,
    imageUrl: data.images?.[0]?.url,
    product: data.product,
  };
}

/**
 * Fetch user recently played tracks.
 */
export async function fetchRecentlyPlayed(limit = 20): Promise<SpotifyTrack[]> {
  const data = await spotifyApiFetch(`/me/player/recently-played?limit=${limit}`);
  if (!data?.items) return [];

  return data.items.map((item: any) => {
    const track = item.track;
    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map((a: any) => ({ id: a.id, name: a.name })),
      albumName: track.album?.name || '',
      albumImageUrl: track.album?.images?.[0]?.url,
      uri: track.uri,
      durationMs: track.duration_ms,
    };
  });
}

/**
 * Fetch user liked / saved tracks.
 */
export async function fetchLikedSongs(limit = 20): Promise<SpotifyTrack[]> {
  const data = await spotifyApiFetch(`/me/tracks?limit=${limit}`);
  if (!data?.items) return [];

  return data.items.map((item: any) => {
    const track = item.track;
    return {
      id: track.id,
      name: track.name,
      artists: track.artists.map((a: any) => ({ id: a.id, name: a.name })),
      albumName: track.album?.name || '',
      albumImageUrl: track.album?.images?.[0]?.url,
      uri: track.uri,
      durationMs: track.duration_ms,
    };
  });
}

/**
 * Search Spotify for tracks.
 */
export async function searchSpotifyTracks(query: string, limit = 5): Promise<SpotifyTrack[]> {
  const encoded = encodeURIComponent(query);
  const data = await spotifyApiFetch(`/search?q=${encoded}&type=track&limit=${limit}`);
  if (!data?.tracks?.items) return [];

  return data.tracks.items.map((track: any) => ({
    id: track.id,
    name: track.name,
    artists: track.artists.map((a: any) => ({ id: a.id, name: a.name })),
    albumName: track.album?.name || '',
    albumImageUrl: track.album?.images?.[0]?.url,
    uri: track.uri,
    durationMs: track.duration_ms,
  }));
}
