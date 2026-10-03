import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  isActive: boolean;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({ isActive, onOpenGuide }) => {
  return (
    <View style={styles.container}>
      <View style={styles.leftRow}>
        <View style={styles.iconCircle}>
          <Ionicons name="flash" size={20} color="#1DB954" />
        </View>
        <View>
          <Text style={styles.title}>Spotify Ad Skip</Text>
          <Text style={styles.subtitle}>Automatic Loophole Skipper</Text>
        </View>
      </View>

      <View style={styles.rightRow}>
        <View
          style={[
            styles.statusBadge,
            isActive ? styles.statusBadgeActive : styles.statusBadgeInactive,
          ]}
        >
          <View
            style={[
              styles.statusDot,
              isActive ? styles.statusDotActive : styles.statusDotInactive,
            ]}
          />
          <Text
            style={[
              styles.statusText,
              isActive ? styles.statusTextActive : styles.statusTextInactive,
            ]}
          >
            {isActive ? 'ACTIVE' : 'IDLE'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.guideButton}
          onPress={onOpenGuide}
          activeOpacity={0.7}
        >
          <Ionicons name="help-circle-outline" size={22} color="#94A3B8" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#0D0F12',
    borderBottomWidth: 1,
    borderBottomColor: '#1E232B',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#13281E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1DB95440',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusBadgeActive: {
    backgroundColor: '#132B1F',
    borderWidth: 1,
    borderColor: '#1DB95450',
  },
  statusBadgeInactive: {
    backgroundColor: '#20242C',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusDotActive: {
    backgroundColor: '#1ED760',
  },
  statusDotInactive: {
    backgroundColor: '#6B7280',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statusTextActive: {
    color: '#1ED760',
  },
  statusTextInactive: {
    color: '#9CA3AF',
  },
  guideButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#181B20',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2A313D',
  },
});
