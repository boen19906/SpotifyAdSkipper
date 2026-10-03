import { useCallback, useEffect, useState } from 'react';
import { ResponseType, useAuthRequest } from 'expo-auth-session';
import {
  exchangeCodeForTokens,
  fetchLikedSongs,
  fetchRecentlyPlayed,
  fetchUserProfile,
  getStoredClientId,
  getStoredTokens,
  logoutSpotify,
  saveStoredClientId,
  SPOTIFY_DISCOVERY,
  SPOTIFY_REDIRECT_URI,
  SPOTIFY_SCOPES,
  SpotifyTrack,
  SpotifyUserProfile,
} from '../services/spotifyAuth';

export function useSpotifyAuth() {
  const [clientId, setClientIdState] = useState<string>('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [profile, setProfile] = useState<SpotifyUserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [request, response, promptAsync] = useAuthRequest(
    {
      responseType: ResponseType.Code,
      clientId: clientId || 'placeholder',
      scopes: SPOTIFY_SCOPES,
      usePKCE: true,
      redirectUri: SPOTIFY_REDIRECT_URI,
    },
    SPOTIFY_DISCOVERY
  );

  // Load existing credentials on mount
  useEffect(() => {
    async function init() {
      try {
        const savedClientId = await getStoredClientId();
        if (savedClientId) {
          setClientIdState(savedClientId);
        }

        const tokens = await getStoredTokens();
        if (tokens?.accessToken) {
          try {
            const user = await fetchUserProfile();
            setProfile(user);
            setIsAuthenticated(true);
          } catch (e) {
            console.warn('Could not fetch user profile on init', e);
            // Token might be valid or refreshable later
            setIsAuthenticated(true);
          }
        }
      } catch (err: any) {
        console.error('Failed to init Spotify auth', err);
      } finally {
        setIsLoading(false);
      }
    }
    init();
  }, []);

  // Handle incoming OAuth redirect response
  useEffect(() => {
    async function handleResponse() {
      if (!response) return;

      if (response.type === 'success' && response.params.code) {
        if (!request?.codeVerifier) {
          setError('Missing PKCE code verifier.');
          return;
        }

        try {
          setIsLoading(true);
          setError(null);
          await exchangeCodeForTokens(
            response.params.code,
            request.codeVerifier,
            clientId
          );
          const user = await fetchUserProfile();
          setProfile(user);
          setIsAuthenticated(true);
        } catch (err: any) {
          console.error('Token exchange failed', err);
          setError(err?.message || 'Authentication failed during token exchange');
        } finally {
          setIsLoading(false);
        }
      } else if (response.type === 'error') {
        setError(response.error?.message || 'Spotify login cancelled or failed');
      }
    }

    handleResponse();
  }, [response, request?.codeVerifier, clientId]);

  const updateClientId = useCallback(async (newId: string) => {
    const trimmed = newId.trim();
    setClientIdState(trimmed);
    await saveStoredClientId(trimmed);
  }, []);

  const login = useCallback(async () => {
    setError(null);
    if (!clientId) {
      setError('Please provide a Spotify Client ID from developer.spotify.com first.');
      return;
    }
    if (!request) {
      setError('Auth request is still preparing. Please retry in a second.');
      return;
    }
    try {
      await promptAsync();
    } catch (err: any) {
      setError(err?.message || 'Could not launch authentication window');
    }
  }, [clientId, request, promptAsync]);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await logoutSpotify();
      setIsAuthenticated(false);
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadRecentTracks = useCallback(async (limit = 20): Promise<SpotifyTrack[]> => {
    try {
      return await fetchRecentlyPlayed(limit);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch recently played tracks');
      return [];
    }
  }, []);

  const loadLikedSongs = useCallback(async (limit = 20): Promise<SpotifyTrack[]> => {
    try {
      return await fetchLikedSongs(limit);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch liked songs');
      return [];
    }
  }, []);

  return {
    clientId,
    updateClientId,
    isAuthenticated,
    isLoading,
    profile,
    error,
    login,
    logout,
    loadRecentTracks,
    loadLikedSongs,
    redirectUri: SPOTIFY_REDIRECT_URI,
  };
}
