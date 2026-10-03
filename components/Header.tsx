import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ThemeColors, ANDROID_STATUS_BAR_HEIGHT } from '../theme';

interface HeaderProps {
  theme: ThemeColors;
  isDark: boolean;
  isActive: boolean;
  onToggleTheme: () => void;
  onOpenGuide: () => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  theme,
  isDark,
  isActive,
  onToggleTheme,
  onOpenGuide,
  onOpenSettings,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: ANDROID_STATUS_BAR_HEIGHT + 10,
        },
      ]}
    >
      {/* Top Utility Bar: Status Pill on left, quick action icons on right */}
      <View style={styles.topUtilityRow}>
        <View
          style={[
            styles.statusPill,
            {
              backgroundColor: isActive ? theme.accentSubtle : theme.surfaceSubtle,
              borderColor: isActive ? theme.accent : theme.border,
            },
          ]}
        >
          <View
            style={[
              styles.statusDot,
              { backgroundColor: isActive ? theme.accent : theme.textMuted },
            ]}
          />
          <Text
            style={[
              styles.statusText,
              { color: isActive ? theme.accentText : theme.textSecondary },
            ]}
          >
            {isActive ? 'Active' : 'Idle'}
          </Text>
        </View>

        <View style={styles.utilityActions}>
          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={onToggleTheme}
            activeOpacity={0.7}
            accessibilityLabel="Toggle Theme"
          >
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={17}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={onOpenSettings}
            activeOpacity={0.7}
            accessibilityLabel="Settings"
          >
            <Ionicons
              name="options-outline"
              size={17}
              color={theme.textPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.iconBtn,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}
            onPress={onOpenGuide}
            activeOpacity={0.7}
            accessibilityLabel="Help Guide"
          >
            <Ionicons
              name="help-circle-outline"
              size={17}
              color={theme.textPrimary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Editorial Headline (Matches "Good evening / Find your calm" in reference image) */}
      <View style={styles.editorialTitleSection}>
        <Text style={[styles.greeting, { color: theme.textSecondary }]}>
          {getGreeting()}
        </Text>
        <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>
          Silence the noise
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  topUtilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  utilityActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editorialTitleSection: {
    marginTop: 2,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
    marginBottom: 2,
  },
  mainTitle: {
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 36,
  },
});
