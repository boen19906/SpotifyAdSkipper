import React from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

interface MasterPowerCardProps {
  isEnabled: boolean;
  onToggle: (value: boolean) => void;
  onOpenSpotify: () => void;
  isSpotifyInstalled: boolean;
}

export const MasterPowerCard: React.FC<MasterPowerCardProps> = ({
  isEnabled,
  onToggle,
  onOpenSpotify,
  isSpotifyInstalled,
}) => {
  const handleSwitchChange = (val: boolean) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {}
    onToggle(val);
  };

  return (
    <View style={[styles.card, isEnabled ? styles.cardActive : styles.cardInactive]}>
      <View style={styles.topRow}>
        <View style={styles.iconContainer}>
          <Ionicons
            name={isEnabled ? 'shield-checkmark' : 'shield-outline'}
            size={28}
            color={isEnabled ? '#1ED760' : '#64748B'}
          />
        </View>

        <View style={styles.infoCol}>
          <Text style={styles.cardTitle}>
            {isEnabled ? 'Protection Active' : 'Protection Paused'}
          </Text>
          <Text style={styles.cardDesc}>
            {isEnabled
              ? 'Monitoring background playback to skip ads'
              : 'Tap switch to resume automatic ad skipping'}
          </Text>
        </View>

        <Switch
          value={isEnabled}
          onValueChange={handleSwitchChange}
          trackColor={{ false: '#334155', true: '#14532D' }}
          thumbColor={isEnabled ? '#1ED760' : '#94A3B8'}
        />
      </View>

      <View style={styles.divider} />

      <View style={styles.actionRow}>
        <View style={styles.badgeRow}>
          <Ionicons name="infinite" size={16} color="#10B981" />
          <Text style={styles.badgeText}>Auto Loophole Active</Text>
        </View>

        <TouchableOpacity
          style={styles.openSpotifyBtn}
          onPress={onOpenSpotify}
          activeOpacity={0.8}
        >
          <Ionicons name="musical-notes" size={14} color="#FFFFFF" />
          <Text style={styles.openSpotifyText}>
            {isSpotifyInstalled ? 'Open Spotify' : 'Get Spotify'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 18,
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#161A22',
    borderWidth: 1,
  },
  cardActive: {
    borderColor: '#1DB95450',
    backgroundColor: '#111A16',
  },
  cardInactive: {
    borderColor: '#262D38',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1B242B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#262D3850',
    marginVertical: 14,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#10B981',
  },
  openSpotifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1DB954',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  openSpotifyText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
