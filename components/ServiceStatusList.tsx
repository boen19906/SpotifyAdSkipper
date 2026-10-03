import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../theme';

interface ServiceStatusListProps {
  theme: ThemeColors;
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
  theme,
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
  const activeCount = [
    isServiceRunning,
    isNotificationGranted,
    isAccessibilityGranted,
    isBatteryOptimized,
  ].filter(Boolean).length;

  return (
    <View style={styles.container}>
      {/* Section Header with count */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          System readiness
        </Text>
        <Text style={[styles.sectionMeta, { color: theme.textSecondary }]}>
          {activeCount}/4 active
        </Text>
      </View>

      <View
        style={[
          styles.listCard,
          { backgroundColor: theme.surface, borderColor: theme.border },
        ]}
      >
        {/* 1. Foreground Monitor Service */}
        <TouchableOpacity
          style={[styles.itemRow, { borderBottomColor: theme.borderSubtle }]}
          onPress={onToggleService}
          activeOpacity={0.7}
        >
          <View
            style={[
              styles.itemSquircle,
              {
                backgroundColor: isServiceRunning
                  ? theme.accentSubtle
                  : theme.surfaceSubtle,
              },
            ]}
          >
            <Ionicons
              name="hardware-chip-outline"
              size={18}
              color={isServiceRunning ? theme.accent : theme.textSecondary}
            />
          </View>

          <View style={styles.itemContent}>
            <Text
              style={[styles.itemTitle, { color: theme.textPrimary }]}
              numberOfLines={1}
            >
              Background Service
            </Text>
            <Text
              style={[styles.itemSubtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {isServiceRunning ? 'Running in background' : 'Stopped · Tap to start'}
            </Text>
          </View>

          <View style={styles.rightAction}>
            <Text
              style={[
                styles.actionLabel,
                { color: isServiceRunning ? theme.accent : theme.textSecondary },
              ]}
            >
              {isServiceRunning ? 'Active' : 'Start'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={isServiceRunning ? theme.accent : theme.textMuted}
            />
          </View>
        </TouchableOpacity>

        {/* 2. Notification Listener */}
        <TouchableOpacity
          style={[styles.itemRow, { borderBottomColor: theme.borderSubtle }]}
          onPress={isNotificationGranted ? undefined : onRequestNotificationAccess}
          activeOpacity={isNotificationGranted ? 1 : 0.7}
        >
          <View
            style={[
              styles.itemSquircle,
              {
                backgroundColor: isNotificationGranted
                  ? theme.accentSubtle
                  : theme.warningSubtle,
              },
            ]}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={isNotificationGranted ? theme.accent : theme.warning}
            />
          </View>

          <View style={styles.itemContent}>
            <Text
              style={[styles.itemTitle, { color: theme.textPrimary }]}
              numberOfLines={1}
            >
              Notification Access
            </Text>
            <Text
              style={[styles.itemSubtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {isNotificationGranted ? 'Media detection active' : 'Permission needed'}
            </Text>
          </View>

          <View style={styles.rightAction}>
            <Text
              style={[
                styles.actionLabel,
                { color: isNotificationGranted ? theme.accent : theme.warning },
              ]}
            >
              {isNotificationGranted ? 'Active' : 'Grant'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={isNotificationGranted ? theme.accent : theme.warning}
            />
          </View>
        </TouchableOpacity>

        {/* 3. Accessibility Service */}
        <TouchableOpacity
          style={[styles.itemRow, { borderBottomColor: theme.borderSubtle }]}
          onPress={isAccessibilityGranted ? undefined : onRequestAccessibility}
          activeOpacity={isAccessibilityGranted ? 1 : 0.7}
        >
          <View
            style={[
              styles.itemSquircle,
              {
                backgroundColor: isAccessibilityGranted
                  ? theme.accentSubtle
                  : theme.warningSubtle,
              },
            ]}
          >
            <Ionicons
              name="power-outline"
              size={18}
              color={isAccessibilityGranted ? theme.accent : theme.warning}
            />
          </View>

          <View style={styles.itemContent}>
            <Text
              style={[styles.itemTitle, { color: theme.textPrimary }]}
              numberOfLines={1}
            >
              Auto-Exit Service
            </Text>
            <Text
              style={[styles.itemSubtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {isAccessibilityGranted
                ? 'Force-stop automation ready'
                : 'Needed for Android 14+'}
            </Text>
          </View>

          <View style={styles.rightAction}>
            <Text
              style={[
                styles.actionLabel,
                { color: isAccessibilityGranted ? theme.accent : theme.warning },
              ]}
            >
              {isAccessibilityGranted ? 'Active' : 'Enable'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={isAccessibilityGranted ? theme.accent : theme.warning}
            />
          </View>
        </TouchableOpacity>

        {/* 4. Battery Optimization */}
        <TouchableOpacity
          style={[styles.itemRow, { borderBottomColor: theme.borderSubtle }]}
          onPress={isBatteryOptimized ? undefined : onRequestBatteryExemption}
          activeOpacity={isBatteryOptimized ? 1 : 0.7}
        >
          <View
            style={[
              styles.itemSquircle,
              {
                backgroundColor: isBatteryOptimized
                  ? theme.accentSubtle
                  : theme.warningSubtle,
              },
            ]}
          >
            <Ionicons
              name="battery-charging-outline"
              size={18}
              color={isBatteryOptimized ? theme.accent : theme.warning}
            />
          </View>

          <View style={styles.itemContent}>
            <Text
              style={[styles.itemTitle, { color: theme.textPrimary }]}
              numberOfLines={1}
            >
              Battery Exemption
            </Text>
            <Text
              style={[styles.itemSubtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              {isBatteryOptimized
                ? 'Unrestricted background runs'
                : 'May sleep when locked'}
            </Text>
          </View>

          <View style={styles.rightAction}>
            <Text
              style={[
                styles.actionLabel,
                { color: isBatteryOptimized ? theme.accent : theme.warning },
              ]}
            >
              {isBatteryOptimized ? 'Exempt' : 'Fix'}
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={isBatteryOptimized ? theme.accent : theme.warning}
            />
          </View>
        </TouchableOpacity>

        {/* 5. Spotify Broadcast Guide */}
        <TouchableOpacity
          style={[styles.itemRow, styles.itemRowLast]}
          onPress={onOpenBroadcastGuide}
          activeOpacity={0.7}
        >
          <View
            style={[styles.itemSquircle, { backgroundColor: theme.surfaceSubtle }]}
          >
            <Ionicons
              name="radio-outline"
              size={18}
              color={theme.accent}
            />
          </View>

          <View style={styles.itemContent}>
            <Text
              style={[styles.itemTitle, { color: theme.textPrimary }]}
              numberOfLines={1}
            >
              Spotify Broadcast Setup
            </Text>
            <Text
              style={[styles.itemSubtitle, { color: theme.textSecondary }]}
              numberOfLines={1}
            >
              Device broadcast status guide
            </Text>
          </View>

          <View style={styles.rightAction}>
            <Text style={[styles.actionLabel, { color: theme.textSecondary }]}>
              Guide
            </Text>
            <Ionicons
              name="chevron-forward"
              size={14}
              color={theme.textMuted}
            />
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  listCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  itemSquircle: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
    marginRight: 6,
  },
  itemTitle: {
    fontSize: 13.5,
    fontWeight: '600',
    marginBottom: 2,
  },
  itemSubtitle: {
    fontSize: 11.5,
    lineHeight: 15,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  actionLabel: {
    fontSize: 12.5,
    fontWeight: '600',
  },
});
