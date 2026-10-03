import React, { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Linking,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ListenedStats, ListenedTrack } from '../storage/listenedTracksStorage';
import { ThemeColors } from '../theme';

interface ListenedLibraryProps {
  theme: ThemeColors;
  tracks: ListenedTrack[];
  stats: ListenedStats;
  activePlayback: {
    track: string;
    artist: string;
    album: string;
    isPlaying: boolean;
    isAd: boolean;
    elapsedSeconds: number;
    durationMs: number;
  } | null;
  onDeleteTrack: (id: string) => void;
  onClearAll: () => void;
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffSec = Math.floor((now - timestamp) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '';
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

export const ListenedLibrary: React.FC<ListenedLibraryProps> = ({
  theme,
  tracks,
  stats,
  activePlayback,
  onDeleteTrack,
  onClearAll,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const query = searchQuery.trim().toLowerCase();
    return tracks.filter(
      (t) =>
        t.title.toLowerCase().includes(query) ||
        t.artist.toLowerCase().includes(query) ||
        t.album.toLowerCase().includes(query)
    );
  }, [tracks, searchQuery]);

  const handlePlayInSpotify = (track: ListenedTrack) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}

    const uri = track.trackId && track.trackId.startsWith('spotify:')
      ? track.trackId
      : `spotify:search:${encodeURIComponent(`${track.title} ${track.artist}`)}`;

    Linking.openURL(uri).catch(() => {
      // Fallback to web search
      Linking.openURL(
        `https://open.spotify.com/search/${encodeURIComponent(
          `${track.title} ${track.artist}`
        )}`
      );
    });
  };

  const handleConfirmClear = () => {
    Alert.alert(
      'Clear Tracked Library',
      'Are you sure you want to delete all tracked listening history? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch {}
            onClearAll();
          },
        },
      ]
    );
  };

  const renderActiveCard = () => {
    if (!activePlayback || activePlayback.isAd || !activePlayback.track) {
      return null;
    }

    const elapsed = activePlayback.elapsedSeconds;
    const targetThreshold = 20;
    const isLogged = elapsed >= targetThreshold;
    const progress = Math.min(elapsed / targetThreshold, 1.0);

    return (
      <View
        style={[
          styles.activeCard,
          {
            backgroundColor: theme.surfaceElevated,
            borderColor: isLogged ? theme.accent : theme.border,
          },
        ]}
      >
        <View style={styles.activeHeaderRow}>
          <View style={styles.activePillContainer}>
            <View
              style={[
                styles.pulsingDot,
                { backgroundColor: activePlayback.isPlaying ? theme.accent : theme.warning },
              ]}
            />
            <Text style={[styles.activePillText, { color: theme.accentText }]}>
              {activePlayback.isPlaying ? 'LISTENING NOW' : 'PAUSED'}
            </Text>
          </View>
          <Text style={[styles.activeTimerText, { color: theme.textSecondary }]}>
            {elapsed}s {isLogged ? '(✓ Saved to Library)' : `/ ${targetThreshold}s threshold`}
          </Text>
        </View>

        <Text style={[styles.activeTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {activePlayback.track}
        </Text>
        <Text style={[styles.activeArtist, { color: theme.textSecondary }]} numberOfLines={1}>
          {activePlayback.artist} {activePlayback.album ? `• ${activePlayback.album}` : ''}
        </Text>

        {/* Progress bar towards logging */}
        <View style={[styles.progressTrack, { backgroundColor: theme.surfaceSubtle }]}>
          <View
            style={[
              styles.progressBar,
              {
                width: `${Math.round(progress * 100)}%`,
                backgroundColor: isLogged ? theme.accent : theme.warning,
              },
            ]}
          />
        </View>
      </View>
    );
  };

  const renderListHeader = () => (
    <View style={styles.headerWrapper}>
      {/* Overview Stats Bar */}
      <View style={[styles.statsRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {stats.uniqueTracksCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Unique Songs</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.borderSubtle }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {stats.totalListenedCount}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Total Plays</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: theme.borderSubtle }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: theme.textPrimary }]}>
            {stats.totalMinutesListened}m
          </Text>
          <Text style={[styles.statLabel, { color: theme.textMuted }]}>Time Listened</Text>
        </View>
      </View>

      {/* Real-time active song banner */}
      {renderActiveCard()}

      {/* Search & Actions Header */}
      <View style={styles.headerBar}>
        <View
          style={[
            styles.searchBox,
            {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            },
          ]}
        >
          <Ionicons name="search" size={16} color={theme.textMuted} style={styles.searchIcon} />
          <TextInput
            placeholder="Search tracked songs or artists..."
            placeholderTextColor={theme.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            style={[styles.searchInput, { color: theme.textPrimary }]}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close-circle" size={16} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {tracks.length > 0 && (
          <TouchableOpacity
            style={[styles.clearBtn, { backgroundColor: theme.surfaceSubtle }]}
            onPress={handleConfirmClear}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={17} color={theme.danger} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Tracked Songs List */}
      <FlatList
        data={filteredTracks}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={[styles.emptyContainer, { borderColor: theme.borderSubtle }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: theme.surfaceSubtle }]}>
              <Ionicons name="musical-notes-outline" size={32} color={theme.textMuted} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
              {searchQuery ? 'No matching songs found' : 'No songs tracked yet'}
            </Text>
            <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
              {searchQuery
                ? 'Try a different song or artist title.'
                : 'Play any song on Spotify! As you listen for >20 seconds, it will automatically be saved to your library.'}
            </Text>
          </View>
        }
        renderItem={({ item, index }) => (
          <View
            style={[
              styles.trackItem,
              {
                backgroundColor: theme.surface,
                borderColor: theme.borderSubtle,
              },
            ]}
          >
            {/* Index / Music Icon */}
            <View style={[styles.trackIndexBox, { backgroundColor: theme.surfaceSubtle }]}>
              <Text style={[styles.trackIndexText, { color: theme.textMuted }]}>
                {index + 1}
              </Text>
            </View>

            {/* Song Meta */}
            <View style={styles.trackDetails}>
              <Text style={[styles.trackTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.trackSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {item.artist} {item.album ? `• ${item.album}` : ''}
              </Text>
              <View style={styles.badgeRow}>
                <View style={[styles.playCountBadge, { backgroundColor: theme.accentSubtle }]}>
                  <Text style={[styles.playCountText, { color: theme.accentText }]}>
                    {item.listenCount > 1 ? `🔥 ${item.listenCount} plays` : '1 play'}
                  </Text>
                </View>
                {item.durationMs > 0 && (
                  <Text style={[styles.metaText, { color: theme.textMuted }]}>
                    {formatDuration(item.durationMs)}
                  </Text>
                )}
                <Text style={[styles.metaText, { color: theme.textMuted }]}>
                  {formatTimeAgo(item.lastListenedAt)}
                </Text>
              </View>
            </View>

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.playBtn, { backgroundColor: theme.accent }]}
                onPress={() => handlePlayInSpotify(item)}
                activeOpacity={0.7}
                accessibilityLabel="Play in Spotify"
              >
                <Ionicons name="play" size={15} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => onDeleteTrack(item.id)}
                activeOpacity={0.6}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={16} color={theme.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerWrapper: {
    marginBottom: 4,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 14,
  },
  statBox: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 26,
  },
  activeCard: {
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  activeHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  activePillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  pulsingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  activeTimerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  activeTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  activeArtist: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 10,
  },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    paddingVertical: 0,
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 40,
    gap: 8,
  },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  trackIndexBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackIndexText: {
    fontSize: 12,
    fontWeight: '700',
  },
  trackDetails: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  trackSub: {
    fontSize: 12,
    fontWeight: '400',
    marginBottom: 6,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  playCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  playCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  metaText: {
    fontSize: 11,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteBtn: {
    padding: 4,
  },
  emptyContainer: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
});
