import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SkipperConfig } from '../modules/spotify-ad-skipper';
import { ThemeColors } from '../theme';

interface SettingsModalProps {
  theme: ThemeColors;
  visible: boolean;
  config: SkipperConfig;
  onClose: () => void;
  onSaveConfig: (newConfig: {
    enabled: boolean;
    autoMute: boolean;
    restartDelayMs: number;
    relaunchWaitMs: number;
  }) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  theme,
  visible,
  config,
  onClose,
  onSaveConfig,
}) => {
  const [autoMute, setAutoMute] = useState(config.autoMute);
  const [restartDelay, setRestartDelay] = useState(config.restartDelayMs);
  const [relaunchWait, setRelaunchWait] = useState(config.relaunchWaitMs);

  const delayOptions = [600, 800, 1000, 1200, 1500];
  const waitOptions = [1500, 2000, 2500, 3000, 3500];

  const handleSave = () => {
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    onSaveConfig({
      enabled: config.isEnabled,
      autoMute,
      restartDelayMs: restartDelay,
      relaunchWaitMs: relaunchWait,
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.backdropTouch}
          activeOpacity={1}
          onPress={onClose}
        />
        <View
          style={[
            styles.modalContent,
            { backgroundColor: theme.surface, borderColor: theme.border },
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandleContainer}>
            <View
              style={[styles.dragHandle, { backgroundColor: theme.border }]}
            />
          </View>

          {/* Header */}
          <View style={[styles.headerRow, { borderBottomColor: theme.borderSubtle }]}>
            <View style={styles.headerTitleRow}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: theme.accentSubtle },
                ]}
              >
                <Ionicons name="options-outline" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                Loophole Settings
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Scrollable Body */}
          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Auto Mute Card */}
            <View
              style={[
                styles.settingCard,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingTextCol}>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                    Instant Audio Mute
                  </Text>
                  <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>
                    Silences ad audio the moment it starts until your song resumes.
                  </Text>
                </View>
                <Switch
                  value={autoMute}
                  onValueChange={setAutoMute}
                  trackColor={{ false: '#334155', true: '#14532D' }}
                  thumbColor={autoMute ? '#1ED760' : '#94A3B8'}
                />
              </View>
            </View>

            {/* Restart Delay Card */}
            <View
              style={[
                styles.settingCard,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Kill Buffer Delay
              </Text>
              <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>
                Time to pause after closing Spotify before relaunching.
              </Text>
              <View style={styles.pillsRow}>
                {delayOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.delayPill,
                      {
                        backgroundColor:
                          restartDelay === opt
                            ? theme.accentSubtle
                            : theme.surface,
                        borderColor:
                          restartDelay === opt ? theme.accent : theme.border,
                      },
                    ]}
                    onPress={() => setRestartDelay(opt)}
                  >
                    <Text
                      style={[
                        styles.delayPillText,
                        {
                          color:
                            restartDelay === opt
                              ? theme.accentText
                              : theme.textSecondary,
                          fontWeight: restartDelay === opt ? '700' : '500',
                        },
                      ]}
                    >
                      {opt}ms
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Relaunch Wait Card */}
            <View
              style={[
                styles.settingCard,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <Text style={[styles.settingLabel, { color: theme.textPrimary }]}>
                Playback Resume Delay
              </Text>
              <Text style={[styles.settingSubLabel, { color: theme.textSecondary }]}>
                Time to wait for Spotify player to initialize before sending resume event.
              </Text>
              <View style={styles.pillsRow}>
                {waitOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.delayPill,
                      {
                        backgroundColor:
                          relaunchWait === opt
                            ? theme.accentSubtle
                            : theme.surface,
                        borderColor:
                          relaunchWait === opt ? theme.accent : theme.border,
                      },
                    ]}
                    onPress={() => setRelaunchWait(opt)}
                  >
                    <Text
                      style={[
                        styles.delayPillText,
                        {
                          color:
                            relaunchWait === opt
                              ? theme.accentText
                              : theme.textSecondary,
                          fontWeight: relaunchWait === opt ? '700' : '500',
                        },
                      ]}
                    >
                      {opt}ms
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Sticky Bottom Save Button */}
          <View style={styles.footerContainer}>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>Save Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  backdropTouch: {
    flex: 1,
  },
  modalContent: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'android' ? 18 : 28,
  },
  dragHandleContainer: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 6,
  },
  scrollArea: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 10,
  },
  settingCard: {
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  settingTextCol: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  settingSubLabel: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  pillsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  delayPill: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  delayPillText: {
    fontSize: 12,
  },
  footerContainer: {
    paddingTop: 10,
  },
  saveBtn: {
    backgroundColor: '#1DB954',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
