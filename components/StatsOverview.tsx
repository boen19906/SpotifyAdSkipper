import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface StatsOverviewProps {
  totalSkipped: number;
  totalSecondsSaved: number;
  onTestLoophole: () => void;
  isSkipping: boolean;
}

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  totalSkipped,
  totalSecondsSaved,
  onTestLoophole,
  isSkipping,
}) => {
  const minutesSaved = (totalSecondsSaved / 60).toFixed(1);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>LOOPHOLE STATS & TESTING</Text>
        <TouchableOpacity
          style={[styles.testBtn, isSkipping && styles.testBtnDisabled]}
          onPress={onTestLoophole}
          disabled={isSkipping}
          activeOpacity={0.7}
        >
          <Ionicons
            name="play-forward"
            size={14}
            color={isSkipping ? '#94A3B8' : '#1ED760'}
          />
          <Text
            style={[
              styles.testBtnText,
              isSkipping && styles.testBtnTextDisabled,
            ]}
          >
            {isSkipping ? 'Testing...' : 'Test Loophole'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.gridRow}>
        {/* Metric 1 */}
        <View style={styles.statCard}>
          <View style={styles.statIconBadge}>
            <Ionicons name="flash-outline" size={16} color="#1ED760" />
          </View>
          <Text style={styles.statValue}>{totalSkipped}</Text>
          <Text style={styles.statLabel}>Ads Skipped</Text>
        </View>

        {/* Metric 2 */}
        <View style={styles.statCard}>
          <View style={styles.statIconBadge}>
            <Ionicons name="time-outline" size={16} color="#38BDF8" />
          </View>
          <Text style={styles.statValue}>{minutesSaved}m</Text>
          <Text style={styles.statLabel}>Time Saved</Text>
        </View>

        {/* Metric 3 */}
        <View style={styles.statCard}>
          <View style={styles.statIconBadge}>
            <Ionicons name="checkmark-done" size={16} color="#A855F7" />
          </View>
          <Text style={styles.statValue}>Instant</Text>
          <Text style={styles.statLabel}>Skip Method</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  testBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#13281E',
    borderWidth: 1,
    borderColor: '#1DB95460',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  testBtnDisabled: {
    opacity: 0.5,
  },
  testBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#1ED760',
  },
  testBtnTextDisabled: {
    color: '#94A3B8',
  },
  gridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#161A22',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#262D38',
    alignItems: 'center',
  },
  statIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1E232B',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
