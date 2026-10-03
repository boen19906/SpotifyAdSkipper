import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkipRecord } from '../storage/historyStorage';
import { ThemeColors } from '../theme';

interface HistoryListProps {
  theme: ThemeColors;
  history: SkipRecord[];
  onClearHistory: () => void;
}

function formatTimeAgo(timestamp: number) {
  const elapsed = Date.now() - timestamp;
  const seconds = Math.floor(elapsed / 1000);
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

export const HistoryList: React.FC<HistoryListProps> = ({
  theme,
  history,
  onClearHistory,
}) => {

  return (
    <View style={styles.container}>
      {/* Header Row (Like "All sessions    6 sessions") */}
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
          All skips
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.sectionMeta, { color: theme.textSecondary }]}>
            {history.length} {history.length === 1 ? 'record' : 'records'}
          </Text>
          {history.length > 0 && (
            <TouchableOpacity
              onPress={onClearHistory}
              activeOpacity={0.6}
              style={styles.clearBtn}
            >
              <Text style={[styles.clearText, { color: theme.danger }]}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {history.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          <View
            style={[styles.emptyIconCircle, { backgroundColor: theme.surfaceSubtle }]}
          >
            <Ionicons name="musical-notes-outline" size={24} color={theme.textMuted} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            No ads skipped yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            When Spotify plays an advertisement, the loophole will automatically close & relaunch it instantly to resume your queue.
          </Text>
        </View>
      ) : (
        <View
          style={[
            styles.listCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {history.slice(0, 10).map((item, idx) => (
            <View
              key={item.id}
              style={[
                styles.itemRow,
                { borderBottomColor: theme.borderSubtle },
                idx === history.length - 1 || idx === 9 ? styles.itemRowLast : null,
              ]}
            >
              {/* Squircle Thumbnail (styled like reference session icon) */}
              <View
                style={[
                  styles.itemSquircle,
                  {
                    backgroundColor:
                      item.source === 'test' ? theme.warningSubtle : theme.accentSubtle,
                  },
                ]}
              >
                <Ionicons
                  name={item.source === 'test' ? 'flask-outline' : 'play-skip-forward'}
                  size={18}
                  color={item.source === 'test' ? theme.warning : theme.accent}
                />
              </View>

              <View style={styles.itemDetails}>
                <Text
                  style={[styles.itemTitle, { color: theme.textPrimary }]}
                  numberOfLines={1}
                >
                  {item.title}
                </Text>
                <Text
                  style={[styles.itemMeta, { color: theme.textSecondary }]}
                  numberOfLines={1}
                >
                  {formatTimeAgo(item.timestamp)}
                  {item.source === 'test' ? ' • Simulated' : ' • Bypassed'}
                </Text>
              </View>

              {/* Right metadata like "10 min >" */}
              <View style={styles.rightInfo}>
                <Text style={[styles.durationText, { color: theme.textSecondary }]}>
                  ~{item.durationSavedSeconds}s
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={14}
                  color={theme.textMuted}
                />
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionMeta: {
    fontSize: 13,
    fontWeight: '500',
  },
  clearBtn: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 280,
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
    paddingHorizontal: 14,
    borderBottomWidth: 1,
  },
  itemRowLast: {
    borderBottomWidth: 0,
  },
  itemSquircle: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    flexShrink: 0,
  },
  itemDetails: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 3,
  },
  itemMeta: {
    fontSize: 12,
  },
  rightInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexShrink: 0,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
