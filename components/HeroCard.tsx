import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../theme';

interface HeroCardProps {
  theme: ThemeColors;
  isEnabled: boolean;
  onTogglePower: (value: boolean) => void;
  onOpenSpotify: () => void;
  isSpotifyInstalled: boolean;
  track: string;
  artist: string;
  album: string;
  isPlaying: boolean;
  isAd: boolean;
  isSkippingInProgress: boolean;
}

export const HeroCard: React.FC<HeroCardProps> = ({
  theme,
  isEnabled,
  onTogglePower,
  onOpenSpotify,
  isSpotifyInstalled,
  track,
  artist,
  album,
  isPlaying,
  isAd,
  isSkippingInProgress,
}) => {
  const hasMetadata = track.trim().length > 0;

  const handleSwitchChange = (val: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onTogglePower(val);
  };

  const isSkipState = isAd || isSkippingInProgress;
  const isPlayingState = hasMetadata && isPlaying && !isSkipState;

  const cardBg = isSkipState
    ? '#2D1418'
    : isPlayingState
    ? '#0D2619'
    : theme.heroBackground;

  const cardBorder = isSkipState
    ? 'rgba(239, 68, 68, 0.4)'
    : isPlayingState
    ? 'rgba(29, 185, 84, 0.35)'
    : theme.heroBorder;

  const getBadgeInfo = () => {
    if (isSkipState) {
      return {
        text: 'Interception Active',
        color: '#F87171',
        icon: 'flash' as const,
      };
    }
    if (isPlayingState) {
      return {
        text: 'Spotify Live',
        color: '#1ED760',
        icon: 'musical-notes' as const,
      };
    }
    if (isEnabled) {
      return {
        text: 'Auto-Loophole',
        color: '#34D399',
        icon: 'shield-checkmark' as const,
      };
    }
    return {
      text: 'Standby Paused',
      color: '#94A3B8',
      icon: 'pause' as const,
    };
  };

  const badge = getBadgeInfo();

  const getDisplayDetails = () => {
    if (isSkipState) {
      return {
        title: track || 'Advertisement Intercepted',
        subtitle: isSkippingInProgress
          ? 'Fast-restarting Spotify & resuming playback'
          : 'Muting audio and bypassing sponsor segment',
      };
    }
    if (isPlayingState) {
      return {
        title: track,
        subtitle: [artist, album].filter(Boolean).join(' • ') || 'Spotify Audio',
      };
    }
    if (isEnabled) {
      return {
        title: 'Uninterrupted Music',
        subtitle: 'Ready to skip ads instantly with zero audio bleed',
      };
    }
    return {
      title: 'Skipper Paused',
      subtitle: 'Enable the protection switch below to resume auto-skip',
    };
  };

  const details = getDisplayDetails();

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
      {/* Top Row: Badge + Switch with clean spacing */}
      <View style={styles.topBadgeRow}>
        <View style={styles.badgePill}>
          <Ionicons name={badge.icon} size={13} color={badge.color} />
          <Text style={[styles.badgeText, { color: badge.color }]}>
            {badge.text}
          </Text>
        </View>

        <View style={styles.switchWrapper}>
          <Text style={styles.switchLabel}>
            {isEnabled ? 'Guarded' : 'Paused'}
          </Text>
          <Switch
            value={isEnabled}
            onValueChange={handleSwitchChange}
            trackColor={{ false: '#334155', true: '#14532D' }}
            thumbColor={isEnabled ? '#1ED760' : '#94A3B8'}
          />
        </View>
      </View>

      {/* Hero Content (Big Title + Subtitle) */}
      <View style={styles.heroBody}>
        <Text style={styles.heroTitle} numberOfLines={2} ellipsizeMode="tail">
          {details.title}
        </Text>
        <Text style={styles.heroSubtitle} numberOfLines={2} ellipsizeMode="tail">
          {details.subtitle}
        </Text>
      </View>

      {/* Step Progress Line when skipping an ad */}
      {isSkipState && (
        <View style={styles.progressContainer}>
          <View style={styles.stepsRow}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotDone]} />
              <Text style={styles.stepText}>Mute</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotDone]} />
              <Text style={styles.stepText}>Relaunch</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <Text style={styles.stepText}>Resume</Text>
            </View>
          </View>
        </View>
      )}

      {/* Bottom Bar inside Card */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.openSpotifyBtn}
          onPress={onOpenSpotify}
          activeOpacity={0.8}
        >
          <Ionicons name="musical-notes" size={14} color="#FFFFFF" />
          <Text style={styles.openSpotifyText}>
            {isSpotifyInstalled ? 'Open Spotify' : 'Install Spotify'}
          </Text>
        </TouchableOpacity>

        <View style={styles.audioPill}>
          <Ionicons
            name={isSkipState ? 'volume-mute' : 'volume-high'}
            size={13}
            color={isSkipState ? '#EF4444' : '#94A3B8'}
          />
          <Text style={styles.audioPillText}>
            {isSkipState ? 'Auto-Muted' : 'Direct Audio'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 10,
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  topBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 6,
    flexShrink: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  switchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  switchLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  heroBody: {
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 23,
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 29,
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
  },
  progressContainer: {
    marginBottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    borderRadius: 14,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: 3,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4B5563',
  },
  stepDotActive: {
    backgroundColor: '#F59E0B',
  },
  stepDotDone: {
    backgroundColor: '#10B981',
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginHorizontal: 8,
    marginBottom: 10,
  },
  stepText: {
    fontSize: 10,
    color: '#E2E8F0',
    fontWeight: '600',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    gap: 8,
  },
  openSpotifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1DB954',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexShrink: 0,
  },
  openSpotifyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  audioPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 16,
  },
  audioPillText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
