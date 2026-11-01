import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Linking,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  getRecommendations,
  RecommendationItem,
  RecommendationSeed,
} from '../services/recommendationService';
import { ListenedTrack } from '../storage/listenedTracksStorage';
import { ThemeColors } from '../theme';

interface DiscoverRecommendationsProps {
  theme: ThemeColors;
  listenedHistory: ListenedTrack[];
  onDownloadTrack: (track: ListenedTrack) => void;
  onPlayLocalTrack?: (track: ListenedTrack) => void;
  activeLocalTrackId?: string;
  isLocalPlaying?: boolean;
}

export const DiscoverRecommendations: React.FC<DiscoverRecommendationsProps> = ({
  theme,
  listenedHistory,
  onDownloadTrack,
  onPlayLocalTrack,
  activeLocalTrackId,
  isLocalPlaying,
}) => {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [filterSeeds, setFilterSeeds] = useState<RecommendationSeed[]>([]);
  const [selectedSeedId, setSelectedSeedId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    getRecommendations(listenedHistory, false)
      .then((result) => {
        if (isMounted) {
          setRecommendations(result.recommendations);
          setFilterSeeds(result.filterSeeds);
          setIsLoading(false);
        }
      })
      .catch((e) => {
        console.warn('Error loading recommendations', e);
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [listenedHistory]);

  const handleRefresh = async () => {
    if (isRefreshing) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
    setIsRefreshing(true);
    try {
      const result = await getRecommendations(listenedHistory, true);
      setRecommendations(result.recommendations);
      setFilterSeeds(result.filterSeeds);
      if (selectedSeedId !== 'all') {
        const stillExists = result.filterSeeds.some((s) => s.id === selectedSeedId);
        if (!stillExists) setSelectedSeedId('all');
      }
    } catch (e) {
      console.warn('Error refreshing recommendations', e);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSelectSeed = (seedId: string) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    setSelectedSeedId(seedId);
  };

  // Filter recommendations based on active seed and search query
  const filteredItems = useMemo(() => {
    let list = recommendations;

    if (selectedSeedId !== 'all') {
      const activeSeed = filterSeeds.find((s) => s.id === selectedSeedId);
      if (activeSeed?.title) {
        list = list.filter((item) =>
          item.seedReason.toLowerCase().includes(activeSeed.title!.toLowerCase())
        );
      } else if (activeSeed?.artist) {
        list = list.filter((item) =>
          item.seedReason.toLowerCase().includes(activeSeed.artist!.toLowerCase())
        );
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (item) =>
          item.title.toLowerCase().includes(q) || item.artist.toLowerCase().includes(q)
      );
    }

    return list;
  }, [recommendations, selectedSeedId, filterSeeds, searchQuery]);

  const handlePlayInSpotify = (item: RecommendationItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const query = encodeURIComponent(`${item.title} ${item.artist}`);
    Linking.openURL(`spotify:search:${query}`).catch(() => {
      Linking.openURL(`https://open.spotify.com/search/${query}`);
    });
  };

  const handleTriggerDownload = (item: RecommendationItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}

    // Immediate visual feedback in Discover tab
    setRecommendations((prev) =>
      prev.map((r) =>
        r.id === item.id ||
        (r.title.toLowerCase() === item.title.toLowerCase() &&
          r.artist.toLowerCase() === item.artist.toLowerCase())
          ? { ...r, downloadStatus: 'queued', progress: 0 }
          : r
      )
    );

    onDownloadTrack({
      id: item.id,
      title: item.title,
      artist: item.artist,
      album: item.album || 'Discoveries',
      trackId: `spotify:search:${encodeURIComponent(`${item.title} ${item.artist}`)}`,
      durationMs: (item.durationSec || 180) * 1000,
      firstListenedAt: 0,
      lastListenedAt: 0,
      listenCount: 1,
      totalDurationListenedMs: 30000,
      downloadStatus: 'queued',
      progress: 0,
    });
  };

  const handlePlayOffline = (item: RecommendationItem) => {
    if (item.localFilePath && onPlayLocalTrack) {
      onPlayLocalTrack({
        id: item.id,
        title: item.title,
        artist: item.artist,
        album: item.album || '',
        durationMs: (item.durationSec || 180) * 1000,
        firstListenedAt: 0,
        lastListenedAt: 0,
        listenCount: 1,
        totalDurationListenedMs: 0,
        downloadStatus: 'downloaded',
        localFilePath: item.localFilePath,
      });
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Banner */}
      <View
        style={[
          styles.introCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <View style={styles.introLeft}>
          <View style={styles.introTitleRow}>
            <Ionicons name="sparkles" size={17} color={theme.accent} />
            <Text style={[styles.introTitle, { color: theme.textPrimary }]}>
              Tailored For You
            </Text>
          </View>
          <Text style={[styles.introSub, { color: theme.textSecondary }]}>
            Continuously learns from your listened tracks and play frequencies via Last.fm
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.refreshPill,
            { backgroundColor: theme.surfaceSubtle, opacity: isRefreshing ? 0.7 : 1 },
          ]}
          onPress={handleRefresh}
          activeOpacity={0.7}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={theme.accent} style={{ marginRight: 4 }} />
          ) : (
            <Ionicons name="refresh" size={15} color={theme.accent} />
          )}
          <Text style={[styles.refreshText, { color: theme.accent }]}>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Seed Filter Chips Horizontal Scroll */}
      {filterSeeds.length > 1 && (
        <FlatList
          horizontal
          data={filterSeeds}
          keyExtractor={(seed) => seed.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.seedsList}
          renderItem={({ item }) => {
            const isSelected = selectedSeedId === item.id;
            return (
              <TouchableOpacity
                style={[
                  styles.seedChip,
                  {
                    backgroundColor: isSelected ? theme.accent : theme.surface,
                    borderColor: isSelected ? theme.accent : theme.border,
                  },
                ]}
                onPress={() => handleSelectSeed(item.id)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.seedChipText,
                    { color: isSelected ? '#FFFFFF' : theme.textSecondary },
                  ]}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Search Input Bar */}
      <View
        style={[
          styles.searchBox,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        <Ionicons name="search" size={16} color={theme.textMuted} style={styles.searchIcon} />
        <TextInput
          placeholder="Filter recommendations..."
          placeholderTextColor={theme.textMuted}
          value={searchQuery}
          onChangeText={setSearchQuery}
          style={[styles.searchInput, { color: theme.textPrimary }]}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')}>
            <Ionicons name="close-circle" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
          <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
            Analyzing your listening habits...
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={theme.accent}
              colors={[theme.accent]}
            />
          }
          ListEmptyComponent={
            <View style={[styles.emptyBox, { borderColor: theme.borderSubtle }]}>
              <Ionicons name="musical-note-outline" size={36} color={theme.textMuted} />
              <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
                No discoveries found
              </Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                {searchQuery
                  ? 'Try clearing your search filter.'
                  : 'Tap below to fetch music discoveries or play songs on Spotify to expand your recommendations.'}
              </Text>
              <TouchableOpacity
                style={[styles.emptyRefreshBtn, { backgroundColor: theme.accent }]}
                onPress={handleRefresh}
                activeOpacity={0.8}
                disabled={isRefreshing}
              >
                {isRefreshing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                ) : (
                  <Ionicons name="refresh" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                )}
                <Text style={styles.emptyRefreshBtnText}>
                  {isRefreshing ? 'Fetching Discoveries...' : 'Refresh Discoveries'}
                </Text>
              </TouchableOpacity>
            </View>
          }
          renderItem={({ item }) => {
            const isDownloaded = item.downloadStatus === 'downloaded' && !!item.localFilePath;
            const isDownloading = item.downloadStatus === 'downloading';
            const isCurrentPlaying = activeLocalTrackId === item.id && isLocalPlaying;

            return (
              <View
                style={[
                  styles.recCard,
                  {
                    backgroundColor: theme.surface,
                    borderColor: isCurrentPlaying ? theme.accent : theme.borderSubtle,
                    borderWidth: isCurrentPlaying ? 1.5 : 1,
                  },
                ]}
              >
                {/* Artwork or Music Icon */}
                <View
                  style={[
                    styles.artworkCircle,
                    { backgroundColor: theme.surfaceSubtle, borderColor: theme.borderSubtle },
                  ]}
                >
                  {item.artworkUrl ? (
                    <Image source={{ uri: item.artworkUrl }} style={styles.artworkImage} />
                  ) : (
                    <Ionicons
                      name={isCurrentPlaying ? 'volume-high' : 'disc-outline'}
                      size={22}
                      color={isCurrentPlaying ? theme.accent : theme.textMuted}
                    />
                  )}
                </View>

                {/* Track Details */}
                <View style={styles.cardDetails}>
                  <Text style={[styles.trackTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.trackArtist, { color: theme.textSecondary }]} numberOfLines={1}>
                    {item.artist}
                  </Text>

                  {/* Badges: Match Score & Reason */}
                  <View style={styles.badgeRow}>
                    <View style={[styles.matchBadge, { backgroundColor: theme.accentSubtle }]}>
                      <Text style={[styles.matchBadgeText, { color: theme.accentText }]}>
                        🔥 {item.matchScore}% Match
                      </Text>
                    </View>
                    <Text style={[styles.reasonText, { color: theme.textMuted }]} numberOfLines={1}>
                      {item.seedReason}
                    </Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.actionsColumn}>
                  {/* Play offline or Download */}
                  {isDownloaded ? (
                    <TouchableOpacity
                      style={[
                        styles.actionBtn,
                        { backgroundColor: isCurrentPlaying ? theme.warning : theme.accent },
                      ]}
                      onPress={() => handlePlayOffline(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name={isCurrentPlaying ? 'pause' : 'play'}
                        size={15}
                        color="#FFFFFF"
                      />
                    </TouchableOpacity>
                  ) : isDownloading ? (
                    <View style={[styles.actionBtn, { backgroundColor: '#F59E0B20' }]}>
                      <ActivityIndicator size="small" color="#F59E0B" />
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionBtn, { backgroundColor: theme.accentSubtle }]}
                      onPress={() => handleTriggerDownload(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="arrow-down" size={15} color={theme.accent} />
                    </TouchableOpacity>
                  )}

                  {/* Open in Spotify */}
                  <TouchableOpacity
                    style={[styles.actionBtn, { backgroundColor: theme.surfaceSubtle }]}
                    onPress={() => handlePlayInSpotify(item)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="open-outline" size={15} color="#1DB954" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    fontWeight: '500',
  },
  headerContainer: {
    marginBottom: 8,
  },
  introCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  introLeft: {
    flex: 1,
  },
  introTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  introTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  introSub: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '400',
  },
  refreshPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '700',
  },
  seedsList: {
    gap: 8,
    paddingBottom: 12,
  },
  seedChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  seedChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 10,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 40,
    gap: 8,
  },
  recCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  artworkCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
  cardDetails: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  matchBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  matchBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  reasonText: {
    flex: 1,
    fontSize: 10,
    fontWeight: '500',
  },
  actionsColumn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 30,
    alignItems: 'center',
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptySub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginTop: 8,
  },
  emptyRefreshBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
