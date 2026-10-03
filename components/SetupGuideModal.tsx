import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SetupGuideModalProps {
  visible: boolean;
  onClose: () => void;
  onOpenSpotifySettings: () => void;
  onOpenNotificationSettings: () => void;
  onOpenAccessibilitySettings: () => void;
  onRequestBatteryExemption: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  visible,
  onClose,
  onOpenSpotifySettings,
  onOpenNotificationSettings,
  onOpenAccessibilitySettings,
  onRequestBatteryExemption,
}) => {
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
              <Ionicons name="sparkles" size={20} color="#1ED760" />
              <Text style={styles.headerTitle}>Android Setup Guide</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.scrollArea}>
            <Text style={styles.introText}>
              To automatically detect ads and execute the restart loophole seamlessly on Android 14, 15, & 16, ensure these permissions are enabled:
            </Text>

            {/* STEP 1 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>1</Text>
              </View>
              <View style={styles.stepDetails}>
                <Text style={styles.stepTitle}>Notification Listener Access</Text>
                <Text style={styles.stepDesc}>
                  Allows Spotify Ad Skip to instantly detect when Spotify switches to an advertisement.
                </Text>
                <TouchableOpacity
                  style={styles.stepActionBtn}
                  onPress={onOpenNotificationSettings}
                >
                  <Ionicons name="notifications-outline" size={14} color="#1ED760" />
                  <Text style={styles.stepActionText}>Open Notification Settings</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* STEP 2: ACCESSIBILITY */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>2</Text>
              </View>
              <View style={styles.stepDetails}>
                <Text style={styles.stepTitle}>Auto-Exit Accessibility Service</Text>
                <Text style={styles.stepDesc}>
                  <Text style={styles.highlightText}>Required for Android 14+:</Text> Enables the app to cleanly terminate Spotify when an ad starts so it can reopen into your playlist. In Settings: tap <Text style={styles.highlightText}>Installed apps</Text> ➔ <Text style={styles.highlightText}>Spotify Ad Skip Auto-Exit Service</Text> ➔ Turn ON.
                </Text>
                <TouchableOpacity
                  style={styles.stepActionBtn}
                  onPress={onOpenAccessibilitySettings}
                >
                  <Ionicons name="power-outline" size={14} color="#1ED760" />
                  <Text style={styles.stepActionText}>Open Accessibility Settings</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* STEP 3 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>3</Text>
              </View>
              <View style={styles.stepDetails}>
                <Text style={styles.stepTitle}>Spotify Broadcast Status</Text>
                <Text style={styles.stepDesc}>
                  In Spotify Settings: scroll down and turn ON <Text style={styles.highlightText}>&quot;Device Broadcast Status&quot;</Text> (&quot;Allow other apps to see what you are listening to&quot;).
                </Text>
                <TouchableOpacity
                  style={styles.stepActionBtn}
                  onPress={onOpenSpotifySettings}
                >
                  <Ionicons name="settings-outline" size={14} color="#1ED760" />
                  <Text style={styles.stepActionText}>Open Spotify Settings</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* STEP 4 */}
            <View style={styles.stepCard}>
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumber}>4</Text>
              </View>
              <View style={styles.stepDetails}>
                <Text style={styles.stepTitle}>Battery Optimization Exemption</Text>
                <Text style={styles.stepDesc}>
                  Prevents Android from putting the skipper to sleep when your screen is locked.
                </Text>
                <TouchableOpacity
                  style={styles.stepActionBtn}
                  onPress={onRequestBatteryExemption}
                >
                  <Ionicons name="battery-charging-outline" size={14} color="#1ED760" />
                  <Text style={styles.stepActionText}>Exempt from Battery Saver</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* HOW IT WORKS EXPLAINER */}
            <View style={styles.explainerCard}>
              <View style={styles.explainerHeader}>
                <Ionicons name="information-circle" size={18} color="#38BDF8" />
                <Text style={styles.explainerTitle}>Why Accessibility Service?</Text>
              </View>
              <Text style={styles.explainerBody}>
                Starting with Android 14, Google blocked apps from killing other background processes directly. The Accessibility Service allows Spotify Ad Skip to automate closing Spotify when an ad appears, letting the app relaunch fresh and resume your music queue.
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
            <Text style={styles.doneBtnText}>Got it, ready to skip!</Text>
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
    maxHeight: '88%',
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
  introText: {
    fontSize: 13,
    color: '#94A3B8',
    lineHeight: 18,
    marginBottom: 16,
  },
  stepCard: {
    flexDirection: 'row',
    backgroundColor: '#1E232B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#262D38',
  },
  stepNumberBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#132B1F',
    borderWidth: 1,
    borderColor: '#1DB954',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumber: {
    color: '#1ED760',
    fontWeight: '800',
    fontSize: 14,
  },
  stepDetails: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
    marginBottom: 10,
  },
  highlightText: {
    color: '#1ED760',
    fontWeight: '700',
  },
  stepActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#132B1F',
    borderWidth: 1,
    borderColor: '#1DB95460',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  stepActionText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1ED760',
  },
  explainerCard: {
    backgroundColor: '#0F1E28',
    borderRadius: 14,
    padding: 14,
    marginTop: 6,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#0284C740',
  },
  explainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  explainerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#38BDF8',
  },
  explainerBody: {
    fontSize: 12,
    color: '#94A3B8',
    lineHeight: 17,
  },
  doneBtn: {
    backgroundColor: '#1DB954',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 10,
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
