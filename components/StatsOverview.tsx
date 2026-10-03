import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../theme';

interface StatsOverviewProps {
  theme: ThemeColors;
  totalSkipped: number;
  totalSecondsSaved: number;
  onTestLoophole: () => void;
  isSkipping: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  theme,
  totalSkipped,
  totalSecondsSaved,
  onTestLoophole,
  isSkipping,
}) => {
  const minutesSaved = (totalSecondsSaved / 60).toFixed(1);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          Loophole stats
        </Text>
        <Text style={[styles.sectionMeta, { color: theme.textSecondary }]}>
          Real-time
        </Text>
      </View>

      {/* Grid of 2 clean, spacious cards */}
      <View style={styles.gridRow}>
        {/* Card 1: Ads Skipped */}
        <View
          style={[
            styles.statCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: theme.accentSubtle },
            ]}
          >
            <Ionicons name="flash-outline" size={17} color={theme.accent} />
          </View>
          <Text
            style={[styles.statValue, { color: theme.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {totalSkipped}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Ads Bypassed
          </Text>
        </View>

        {/* Card 2: Time Saved */}
        <View
          style={[
            styles.statCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View
            style={[
              styles.iconCircle,
              { backgroundColor: '#E0F2FE' },
            ]}
          >
            <Ionicons name="time-outline" size={17} color="#0284C7" />
          </View>
          <Text
            style={[styles.statValue, { color: theme.textPrimary }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {minutesSaved}m
          </Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
            Time Saved
          </Text>
        </View>
      </View>

      {/* Test Loophole Action Bar */}
      <TouchableOpacity
        style={[
          styles.testBanner,
          {
            backgroundColor: theme.surface,
            borderColor: theme.border,
            opacity: isSkipping ? 0.6 : 1,
          },
        ]}
        onPress={onTestLoophole}
        disabled={isSkipping}
        activeOpacity={0.75}
      >
        <View
          style={[
            styles.testIconSquircle,
            { backgroundColor: isSkipping ? theme.warningSubtle : theme.accentSubtle },
          ]}
        >
          <Ionicons
            name={isSkipping ? 'sync-outline' : 'play-forward-outline'}
            size={18}
            color={isSkipping ? theme.warning : theme.accent}
          />
        </View>

        <View style={styles.testInfoCol}>
          <Text style={[styles.testTitle, { color: theme.textPrimary }]}>
            {isSkipping ? 'Executing Loophole Simulation...' : 'Simulate Loophole Skip'}
          </Text>
          <Text style={[styles.testSubtitle, { color: theme.textSecondary }]}>
            Test mute, exit & relaunch transitions
          </Text>
        </View>

        <View
          style={[
            styles.runPill,
            {
              backgroundColor: isSkipping ? theme.warningSubtle : theme.surfaceSubtle,
              borderColor: isSkipping ? theme.warning : theme.border,
            },
          ]}
        >
          <Text
            style={[
              styles.runPillText,
              { color: isSkipping ? theme.warning : theme.textPrimary },
            ]}
          >
            {isSkipping ? 'Running' : 'Run Test'}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 22,
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
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  testBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginTop: 12,
    gap: 12,
  },
  testIconSquircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  testInfoCol: {
    flex: 1,
  },
  testTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  testSubtitle: {
    fontSize: 11,
  },
  runPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    flexShrink: 0,
  },
  runPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
