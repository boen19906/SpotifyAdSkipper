import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkipRecord } from '../storage/historyStorage';

interface HistoryListProps {
  history: SkipRecord[];
  onClearHistory: () => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({
  history,
  onClearHistory,
}) => {
  const formatTimeAgo = (timestamp: number) => {
    // eslint-disable-next-line react-hooks/purity
    const elapsed = Date.now() - timestamp;
    const seconds = Math.floor(elapsed / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>ACTIVITY LOG ({history.length})</Text>
        {history.length > 0 && (
          <TouchableOpacity onPress={onClearHistory} activeOpacity={0.6}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="musical-notes-outline" size={24} color="#64748B" />
          <Text style={styles.emptyTitle}>No ads skipped yet</Text>
          <Text style={styles.emptySubtitle}>
            When Spotify plays an ad, the loophole will automatically close & restart Spotify to resume your music.
          </Text>
        </View>
      ) : (
        <View style={styles.listCard}>
          {history.slice(0, 10).map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                idx === history.length - 1 || idx === 9 ? styles.itemRowLast : null,
              ]}
            >
              <View style={styles.itemIconCircle}>
                <Ionicons
                  name={item.source === 'test' ? 'flask' : 'play-skip-forward'}
                  size={14}
                  color="#1ED760"
                />
              </View>

              <View style={styles.itemDetails}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.title}
                </Text>
                <Text style={styles.itemMeta}>
                  Saved ~{item.durationSavedSeconds}s • {formatTimeAgo(item.timestamp)}
                  {item.source === 'test' ? ' • Simulation' : ''}
                </Text>
              </View>

              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>SKIPPED</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginTop: 18,
    marginBottom: 40,
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
  clearText: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
  },
  emptyCard: {
    backgroundColor: '#161A22',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262D38',
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#E2E8F0',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 260,
  },
  listCard: {
    backgroundColor: '#161A22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#262D38',
    overflow: 'hidden',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#262D3840',
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  itemIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#132B1F',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  itemMeta: {
    fontSize: 11,
    color: '#94A3B8',
  },
  statusPill: {
    backgroundColor: '#132B1F',
    borderWidth: 1,
    borderColor: '#1DB95460',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#1ED760',
    letterSpacing: 0.5,
  },
});
