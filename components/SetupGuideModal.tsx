import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors } from '../theme';

interface SetupGuideModalProps {
  theme: ThemeColors;
  visible: boolean;
  onClose: () => void;
  onOpenSpotifySettings: () => void;
  onOpenNotificationSettings: () => void;
  onOpenAccessibilitySettings: () => void;
  onRequestBatteryExemption: () => void;
}

export const SetupGuideModal: React.FC<SetupGuideModalProps> = ({
  theme,
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
                <Ionicons name="sparkles" size={18} color={theme.accent} />
              </View>
              <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>
                Android Setup Guide
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollArea}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.introText, { color: theme.textSecondary }]}>
              To automatically detect ads and execute the restart loophole seamlessly on Android 14, 15 & 16, enable these permissions:
            </Text>

            {/* STEP 1 */}
            <View
              style={[
                styles.stepCard,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.stepBadge,
                  { backgroundColor: theme.accentSubtle },
                ]}
              >
                <Text style={[styles.stepNumber, { color: theme.accent }]}>1</Text>
              </View>
              <View style={styles.stepDetails}>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                  Notification Listener
                </Text>
                <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                  Allows Spotify Ad Skip to instantly detect when Spotify begins playing an advertisement.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.stepActionBtn,
                    { backgroundColor: theme.surface, borderColor: theme.accent },
                  ]}
                  onPress={onOpenNotificationSettings}
                >
                  <Ionicons name="notifications-outline" size={14} color={theme.accent} />
                  <Text style={[styles.stepActionText, { color: theme.accent }]}>
                    Open Notification Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* STEP 2 */}
            <View
              style={[
                styles.stepCard,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.stepBadge,
                  { backgroundColor: theme.accentSubtle },
                ]}
              >
                <Text style={[styles.stepNumber, { color: theme.accent }]}>2</Text>
              </View>
              <View style={styles.stepDetails}>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                  Auto-Exit Accessibility Service
                </Text>
                <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                  <Text style={{ fontWeight: '700', color: theme.textPrimary }}>
                    Required on Android 14+:
                  </Text>{' '}
                  Enables clean background termination of Spotify during an ad. In Settings: tap{' '}
                  <Text style={{ fontWeight: '700', color: theme.accent }}>
                    Installed apps
                  </Text>{' '}
                  ➔{' '}
                  <Text style={{ fontWeight: '700', color: theme.accent }}>
                    Spotify Ad Skip Auto-Exit
                  </Text>{' '}
                  ➔ Turn ON.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.stepActionBtn,
                    { backgroundColor: theme.surface, borderColor: theme.accent },
                  ]}
                  onPress={onOpenAccessibilitySettings}
                >
                  <Ionicons name="power-outline" size={14} color={theme.accent} />
                  <Text style={[styles.stepActionText, { color: theme.accent }]}>
                    Open Accessibility Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* STEP 3 */}
            <View
              style={[
                styles.stepCard,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.stepBadge,
                  { backgroundColor: theme.accentSubtle },
                ]}
              >
                <Text style={[styles.stepNumber, { color: theme.accent }]}>3</Text>
              </View>
              <View style={styles.stepDetails}>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                  Spotify Broadcast Status
                </Text>
                <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                  In Spotify Settings: scroll down and turn ON{' '}
                  <Text style={{ fontWeight: '700', color: theme.accent }}>
                    &quot;Device Broadcast Status&quot;
                  </Text>{' '}
                  (&quot;Allow other apps to see what you are listening to&quot;).
                </Text>
                <TouchableOpacity
                  style={[
                    styles.stepActionBtn,
                    { backgroundColor: theme.surface, borderColor: theme.accent },
                  ]}
                  onPress={onOpenSpotifySettings}
                >
                  <Ionicons name="settings-outline" size={14} color={theme.accent} />
                  <Text style={[styles.stepActionText, { color: theme.accent }]}>
                    Open Spotify Settings
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* STEP 4 */}
            <View
              style={[
                styles.stepCard,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <View
                style={[
                  styles.stepBadge,
                  { backgroundColor: theme.accentSubtle },
                ]}
              >
                <Text style={[styles.stepNumber, { color: theme.accent }]}>4</Text>
              </View>
              <View style={styles.stepDetails}>
                <Text style={[styles.stepTitle, { color: theme.textPrimary }]}>
                  Battery Saver Exemption
                </Text>
                <Text style={[styles.stepDesc, { color: theme.textSecondary }]}>
                  Prevents Android OS from putting the ad skipper to sleep when your screen is locked.
                </Text>
                <TouchableOpacity
                  style={[
                    styles.stepActionBtn,
                    { backgroundColor: theme.surface, borderColor: theme.accent },
                  ]}
                  onPress={onRequestBatteryExemption}
                >
                  <Ionicons name="battery-charging-outline" size={14} color={theme.accent} />
                  <Text style={[styles.stepActionText, { color: theme.accent }]}>
                    Exempt App
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Explainer card */}
            <View
              style={[
                styles.explainerCard,
                { backgroundColor: theme.surfaceSubtle, borderColor: theme.border },
              ]}
            >
              <View style={styles.explainerHeader}>
                <Ionicons name="information-circle-outline" size={18} color="#0284C7" />
                <Text style={styles.explainerTitle}>Why Accessibility Service?</Text>
              </View>
              <Text style={[styles.explainerBody, { color: theme.textSecondary }]}>
                Starting with Android 14, Google restricted background apps from killing other processes directly. The Auto-Exit Service automates closing Spotify the millisecond an ad begins, allowing the app to relaunch fresh into your music queue.
              </Text>
            </View>
          </ScrollView>

          {/* Sticky Bottom Done Button */}
          <View style={styles.footerContainer}>
            <TouchableOpacity style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>Got it, ready to skip!</Text>
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
    maxHeight: '90%',
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
    paddingTop: 14,
    paddingBottom: 10,
  },
  introText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  stepCard: {
    flexDirection: 'row',
    borderRadius: 18,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  stepNumber: {
    fontWeight: '800',
    fontSize: 13,
  },
  stepDetails: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 10,
  },
  stepActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  stepActionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  explainerCard: {
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
  },
  explainerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  explainerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284C7',
  },
  explainerBody: {
    fontSize: 12,
    lineHeight: 17,
  },
  footerContainer: {
    paddingTop: 10,
  },
  doneBtn: {
    backgroundColor: '#1DB954',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  doneBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
