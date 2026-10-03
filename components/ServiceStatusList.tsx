import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ServiceStatusListProps {
  isServiceRunning: boolean;
  isNotificationGranted: boolean;
  isAccessibilityGranted: boolean;
  isBatteryOptimized: boolean;
  onToggleService: () => void;
  onRequestNotificationAccess: () => void;
  onRequestAccessibility: () => void;
  onRequestBatteryExemption: () => void;
  onOpenBroadcastGuide: () => void;
}

export const ServiceStatusList: React.FC<ServiceStatusListProps> = ({
  isServiceRunning,
  isNotificationGranted,
  isAccessibilityGranted,
  isBatteryOptimized,
  onToggleService,
  onRequestNotificationAccess,
  onRequestAccessibility,
  onRequestBatteryExemption,
  onOpenBroadcastGuide,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.sectionHeader}>SYSTEM READINESS & PERMISSIONS</Text>

      {/* 1. Background Service */}
      <View style={styles.itemRow}>
        <View style={styles.itemIconCircle}>
          <Ionicons
            name="hardware-chip"
            size={18}
            color={isServiceRunning ? '#1ED760' : '#E2E8F0'}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>Foreground Monitor Service</Text>
          <Text style={styles.itemSubtitle}>
            {isServiceRunning ? 'Running in background' : 'Stopped'}
          </Text>
        </View>
        <TouchableOpacity
          style={[
            styles.actionPill,
            isServiceRunning ? styles.actionPillRunning : styles.actionPillAction,
          ]}
          onPress={onToggleService}
        >
          <Text
            style={[
              styles.actionPillText,
              isServiceRunning ? styles.actionPillTextRunning : styles.actionPillTextAction,
            ]}
          >
            {isServiceRunning ? 'Restart' : 'Start'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 2. Notification Listener */}
      <View style={styles.itemRow}>
        <View style={styles.itemIconCircle}>
          <Ionicons
            name="notifications"
            size={18}
            color={isNotificationGranted ? '#1ED760' : '#F59E0B'}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>Notification Listener</Text>
          <Text style={styles.itemSubtitle}>
            {isNotificationGranted ? 'Media detection active' : 'Permission needed'}
          </Text>
        </View>
        {isNotificationGranted ? (
          <View style={styles.grantedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#1ED760" />
            <Text style={styles.grantedText}>Enabled</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionPill, styles.actionPillWarning]}
            onPress={onRequestNotificationAccess}
          >
            <Text style={[styles.actionPillText, styles.actionPillTextWarning]}>
              Grant Access
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Auto-Exit Accessibility Service (Required for Android 14+) */}
      <View style={styles.itemRow}>
        <View style={styles.itemIconCircle}>
          <Ionicons
            name="power"
            size={18}
            color={isAccessibilityGranted ? '#1ED760' : '#F59E0B'}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>Auto-Exit Accessibility Service</Text>
          <Text style={styles.itemSubtitle}>
            {isAccessibilityGranted
              ? 'Automatic Force-Stop enabled'
              : 'Required on Android 14+ to exit Spotify'}
          </Text>
        </View>
        {isAccessibilityGranted ? (
          <View style={styles.grantedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#1ED760" />
            <Text style={styles.grantedText}>Enabled</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionPill, styles.actionPillWarning]}
            onPress={onRequestAccessibility}
          >
            <Text style={[styles.actionPillText, styles.actionPillTextWarning]}>
              Enable Service
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 4. Battery Optimization */}
      <View style={styles.itemRow}>
        <View style={styles.itemIconCircle}>
          <Ionicons
            name="battery-charging"
            size={18}
            color={isBatteryOptimized ? '#1ED760' : '#F59E0B'}
          />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>Battery Optimization</Text>
          <Text style={styles.itemSubtitle}>
            {isBatteryOptimized ? 'Exempt (won’t sleep)' : 'May be killed by OS'}
          </Text>
        </View>
        {isBatteryOptimized ? (
          <View style={styles.grantedBadge}>
            <Ionicons name="checkmark-circle" size={18} color="#1ED760" />
            <Text style={styles.grantedText}>Exempt</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.actionPill, styles.actionPillWarning]}
            onPress={onRequestBatteryExemption}
          >
            <Text style={[styles.actionPillText, styles.actionPillTextWarning]}>
              Exempt App
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 5. Spotify Broadcast Status */}
      <View style={[styles.itemRow, styles.itemRowLast]}>
        <View style={styles.itemIconCircle}>
          <Ionicons name="radio" size={18} color="#1DB954" />
        </View>
        <View style={styles.itemContent}>
          <Text style={styles.itemTitle}>Spotify Broadcast Status</Text>
          <Text style={styles.itemSubtitle}>Enable in Spotify settings</Text>
        </View>
        <TouchableOpacity
          style={[styles.actionPill, styles.actionPillOutline]}
          onPress={onOpenBroadcastGuide}
        >
          <Text style={[styles.actionPillText, styles.actionPillTextOutline]}>
            Setup Guide
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#161A22',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#262D38',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262D3840',
  },
  itemRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 2,
  },
  itemIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E232B',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 12,
    color: '#94A3B8',
  },
  actionPill: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 14,
  },
  actionPillAction: {
    backgroundColor: '#1DB95425',
    borderWidth: 1,
    borderColor: '#1DB954',
  },
  actionPillRunning: {
    backgroundColor: '#1E232B',
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionPillWarning: {
    backgroundColor: '#F59E0B25',
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  actionPillOutline: {
    backgroundColor: '#1E232B',
    borderWidth: 1,
    borderColor: '#4B5563',
  },
  actionPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  actionPillTextAction: {
    color: '#1ED760',
  },
  actionPillTextRunning: {
    color: '#94A3B8',
  },
  actionPillTextWarning: {
    color: '#FBBF24',
  },
  actionPillTextOutline: {
    color: '#E2E8F0',
  },
  grantedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  grantedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1ED760',
  },
});
