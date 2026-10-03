import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface NowPlayingCardProps {
  track: string;
  artist: string;
  album: string;
  isPlaying: boolean;
  isAd: boolean;
  isSkippingInProgress: boolean;
}

export const NowPlayingCard: React.FC<NowPlayingCardProps> = ({
  track,
  artist,
  album,
  isPlaying,
  isAd,
  isSkippingInProgress,
}) => {
  const hasMetadata = track.length > 0;

  return (
    <View
      style={[
        styles.card,
        isAd || isSkippingInProgress
          ? styles.cardAd
          : hasMetadata && isPlaying
          ? styles.cardPlaying
          : styles.cardIdle,
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.statusIndicatorRow}>
          <View
            style={[
              styles.radarDot,
              isAd || isSkippingInProgress
                ? styles.radarDotAd
                : isPlaying
                ? styles.radarDotPlaying
                : styles.radarDotIdle,
            ]}
          />
          <Text
            style={[
              styles.statusHeaderTitle,
              isAd || isSkippingInProgress ? styles.statusHeaderTitleAd : null,
            ]}
          >
            {isSkippingInProgress
              ? 'LOOPHOLE EXECUTING: RESTARTING SPOTIFY'
              : isAd
              ? 'ADVERTISEMENT DETECTED'
              : isPlaying
              ? 'SPOTIFY PLAYBACK DETECTED'
              : 'SPOTIFY IDLE / WAITING'}
          </Text>
        </View>

        {(isAd || isSkippingInProgress) && (
          <View style={styles.adBadge}>
            <Text style={styles.adBadgeText}>SKIPPING</Text>
          </View>
        )}
      </View>

      <View style={styles.mainContentRow}>
        <View
          style={[
            styles.albumArtContainer,
            isAd || isSkippingInProgress
              ? styles.albumArtAd
              : isPlaying
              ? styles.albumArtPlaying
              : styles.albumArtIdle,
          ]}
        >
          <Ionicons
            name={
              isAd || isSkippingInProgress
                ? 'warning'
                : isPlaying
                ? 'disc'
                : 'musical-note'
            }
            size={28}
            color={
              isAd || isSkippingInProgress
                ? '#EF4444'
                : isPlaying
                ? '#1ED760'
                : '#64748B'
            }
          />
        </View>

        <View style={styles.trackDetailsCol}>
          <Text
            style={[
              styles.trackTitle,
              isAd || isSkippingInProgress ? styles.trackTitleAd : null,
            ]}
            numberOfLines={1}
          >
            {hasMetadata ? track : 'No track active'}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            {artist ? artist : 'Start playing songs in Spotify'}
          </Text>
          {album.length > 0 && (
            <Text style={styles.trackAlbum} numberOfLines={1}>
              {album}
            </Text>
          )}
        </View>
      </View>

      {/* Step progress bar during skip */}
      {isSkippingInProgress && (
        <View style={styles.progressContainer}>
          <View style={styles.stepRow}>
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotDone]} />
              <Text style={styles.stepText}>Mute</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotDone]} />
              <Text style={styles.stepText}>Kill</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={[styles.stepDot, styles.stepDotActive]} />
              <Text style={styles.stepText}>Relaunch</Text>
            </View>
            <View style={styles.stepLine} />
            <View style={styles.stepItem}>
              <View style={styles.stepDot} />
              <Text style={styles.stepText}>Resume</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  cardIdle: {
    backgroundColor: '#161A22',
    borderColor: '#262D38',
  },
  cardPlaying: {
    backgroundColor: '#111A16',
    borderColor: '#1DB95440',
  },
  cardAd: {
    backgroundColor: '#261313',
    borderColor: '#EF444470',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  radarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  radarDotIdle: {
    backgroundColor: '#64748B',
  },
  radarDotPlaying: {
    backgroundColor: '#1ED760',
  },
  radarDotAd: {
    backgroundColor: '#EF4444',
  },
  statusHeaderTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  statusHeaderTitleAd: {
    color: '#F87171',
  },
  adBadge: {
    backgroundColor: '#EF4444',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  adBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  mainContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  albumArtContainer: {
    width: 52,
    height: 52,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  albumArtIdle: {
    backgroundColor: '#1E232B',
  },
  albumArtPlaying: {
    backgroundColor: '#143322',
  },
  albumArtAd: {
    backgroundColor: '#3E1919',
  },
  trackDetailsCol: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  trackTitleAd: {
    color: '#FCA5A5',
  },
  trackArtist: {
    fontSize: 13,
    color: '#94A3B8',
  },
  trackAlbum: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EF444440',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
    backgroundColor: '#374151',
    marginHorizontal: 4,
    marginBottom: 14,
  },
  stepText: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '600',
  },
});
