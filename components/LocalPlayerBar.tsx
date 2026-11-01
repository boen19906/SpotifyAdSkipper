import React from 'react';
import {
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ListenedTrack } from '../storage/listenedTracksStorage';
import { ThemeColors } from '../theme';

interface LocalPlayerBarProps {
  theme: ThemeColors;
  currentTrack: ListenedTrack | null;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  isShuffle: boolean;
  onTogglePlayPause: () => void;
  onSeek: (positionMs: number) => void;
  onNext: () => void;
  onPrevious: () => void;
  onToggleShuffle: () => void;
  onClose: () => void;
}

function formatMillis(ms: number): string {
  if (!ms || ms < 0) return '0:00';
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
}

export const LocalPlayerBar: React.FC<LocalPlayerBarProps> = ({
  theme,
  currentTrack,
  isPlaying,
  positionMs,
  durationMs,
  isShuffle,
  onTogglePlayPause,
  onSeek,
  onNext,
  onPrevious,
  onToggleShuffle,
  onClose,
}) => {
  if (!currentTrack) return null;

  const totalDur = durationMs > 0 ? durationMs : currentTrack.durationMs || 180000;
  const progressRatio = Math.max(0, Math.min(positionMs / totalDur, 1.0));

  const handleProgressBarPress = (event: GestureResponderEvent) => {
    const { locationX } = event.nativeEvent;
    // We measure on layout or estimate width
    event.currentTarget.measure((_x, _y, width) => {
      if (width > 0) {
        const ratio = Math.max(0, Math.min(locationX / width, 1.0));
        onSeek(Math.floor(ratio * totalDur));
      }
    });
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.surfaceElevated,
          borderColor: theme.border,
          shadowColor: '#000',
        },
      ]}
    >
      {/* Tap-to-seek Progress Line */}
      <TouchableOpacity
        style={styles.progressBarWrapper}
        activeOpacity={0.9}
        onPress={handleProgressBarPress}
      >
        <View style={[styles.progressBarTrack, { backgroundColor: theme.surfaceSubtle }]}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${Math.round(progressRatio * 100)}%`,
                backgroundColor: theme.accent,
              },
            ]}
          />
        </View>
      </TouchableOpacity>

      <View style={styles.contentRow}>
        {/* Vinyl / Cover Art indicator */}
        <View
          style={[
            styles.artworkBox,
            {
              backgroundColor: isPlaying ? theme.accentSubtle : theme.surfaceSubtle,
              borderColor: isPlaying ? theme.accent : theme.borderSubtle,
            },
          ]}
        >
          <Ionicons
            name={isPlaying ? 'disc' : 'disc-outline'}
            size={22}
            color={isPlaying ? theme.accent : theme.textMuted}
          />
        </View>

        {/* Track Title, Artist, & Time */}
        <View style={styles.trackInfo}>
          <Text style={[styles.titleText, { color: theme.textPrimary }]} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={[styles.artistText, { color: theme.textSecondary }]} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
          <Text style={[styles.timeText, { color: theme.textMuted }]}>
            {formatMillis(positionMs)} / {formatMillis(totalDur)}
          </Text>
        </View>

        {/* Playback Controls */}
        <View style={styles.controlsRow}>
          {/* Shuffle Toggle */}
          <TouchableOpacity
            style={[
              styles.controlBtn,
              isShuffle && { backgroundColor: theme.accentSubtle, borderRadius: 16 },
            ]}
            onPress={onToggleShuffle}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons
              name="shuffle"
              size={18}
              color={isShuffle ? theme.accent : theme.textMuted}
            />
          </TouchableOpacity>

          {/* Previous Track */}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={onPrevious}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons name="play-skip-back" size={18} color={theme.textPrimary} />
          </TouchableOpacity>

          {/* Play / Pause Primary Action */}
          <TouchableOpacity
            style={[styles.primaryPlayBtn, { backgroundColor: theme.accent }]}
            onPress={onTogglePlayPause}
            activeOpacity={0.8}
          >
            <Ionicons
              name={isPlaying ? 'pause' : 'play'}
              size={18}
              color="#FFFFFF"
              style={{ marginLeft: isPlaying ? 0 : 2 }}
            />
          </TouchableOpacity>

          {/* Next Track */}
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={onNext}
            hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
          >
            <Ionicons name="play-skip-forward" size={18} color={theme.textPrimary} />
          </TouchableOpacity>

          {/* Close Player */}
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="close" size={16} color={theme.textMuted} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
    overflow: 'hidden',
  },
  progressBarWrapper: {
    width: '100%',
    height: 8,
    justifyContent: 'center',
  },
  progressBarTrack: {
    height: 3,
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingTop: 4,
    paddingBottom: 10,
    gap: 10,
  },
  artworkBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  titleText: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  artistText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  timeText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlBtn: {
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryPlayBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtn: {
    padding: 6,
    marginLeft: 2,
  },
});
