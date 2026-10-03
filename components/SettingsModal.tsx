import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Switch,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SkipperConfig } from '../modules/spotify-ad-skipper';

interface SettingsModalProps {
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
        <View style={styles.modalContent}>
          <View style={styles.headerRow}>
            <View style={styles.headerTitleRow}>
              <Ionicons name="options" size={20} color="#1ED760" />
              <Text style={styles.headerTitle}>Loophole Fine-Tuning</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea}>
            {/* Auto Mute Toggle */}
            <View style={styles.settingCard}>
              <View style={styles.settingRow}>
                <View style={styles.settingTextCol}>
                  <Text style={styles.settingLabel}>Auto-Mute During Transition</Text>
                  <Text style={styles.settingSubLabel}>
                    Silences audio instantaneously when an ad is detected until music resumes.
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

            {/* Restart Delay */}
            <View style={styles.settingCard}>
              <Text style={styles.settingLabel}>Process Kill Buffer Delay</Text>
              <Text style={styles.settingSubLabel}>
                Milliseconds to wait after killing Spotify before launching it again.
              </Text>
              <View style={styles.pillsRow}>
                {delayOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.delayPill,
                      restartDelay === opt && styles.delayPillActive,
                    ]}
                    onPress={() => setRestartDelay(opt)}
                  >
                    <Text
                      style={[
                        styles.delayPillText,
                        restartDelay === opt && styles.delayPillTextActive,
                      ]}
                    >
                      {opt}ms
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Relaunch Wait */}
            <View style={styles.settingCard}>
              <Text style={styles.settingLabel}>Playback Resume Delay</Text>
              <Text style={styles.settingSubLabel}>
                {"Milliseconds to wait for Spotify's player to mount before sending the play key event."}
              </Text>
              <View style={styles.pillsRow}>
                {waitOptions.map((opt) => (
                  <TouchableOpacity
                    key={opt}
                    style={[
                      styles.delayPill,
                      relaunchWait === opt && styles.delayPillActive,
                    ]}
                    onPress={() => setRelaunchWait(opt)}
                  >
                    <Text
                      style={[
                        styles.delayPillText,
                        relaunchWait === opt && styles.delayPillTextActive,
                      ]}
                    >
                      {opt}ms
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
            <Text style={styles.saveBtnText}>Save Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000B0',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#161A22',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    padding: 20,
    borderWidth: 1,
    borderColor: '#262D38',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#262D38',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  closeBtn: {
    padding: 4,
  },
  scrollArea: {
    marginTop: 14,
  },
  settingCard: {
    backgroundColor: '#1E232B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#262D38',
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
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingSubLabel: {
    fontSize: 12,
    color: '#94A3B8',
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
    borderRadius: 8,
    backgroundColor: '#161A22',
    borderWidth: 1,
    borderColor: '#374151',
  },
  delayPillActive: {
    backgroundColor: '#132B1F',
    borderColor: '#1DB954',
  },
  delayPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  delayPillTextActive: {
    color: '#1ED760',
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: '#1DB954',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
