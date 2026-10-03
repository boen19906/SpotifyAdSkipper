import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../theme';

export type BottomNavTab = 'skipper' | 'activity' | 'readiness';

interface BottomNavProps {
  theme: ThemeColors;
  activeTab: BottomNavTab;
  onSelectTab: (tab: BottomNavTab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  theme,
  activeTab,
  onSelectTab,
}) => {
  const handleTabPress = (tab: BottomNavTab) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelectTab(tab);
  };

  const tabs: {
    id: BottomNavTab;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    iconActive: keyof typeof Ionicons.glyphMap;
  }[] = [
    {
      id: 'skipper',
      label: 'Skipper',
      icon: 'radio-outline',
      iconActive: 'radio',
    },
    {
      id: 'activity',
      label: 'Activity',
      icon: 'stats-chart-outline',
      iconActive: 'stats-chart',
    },
    {
      id: 'readiness',
      label: 'Readiness',
      icon: 'shield-checkmark-outline',
      iconActive: 'shield-checkmark',
    },
  ];

  return (
    <View
      style={[
        styles.navBar,
        {
          backgroundColor: theme.bottomNavBg,
          borderTopColor: theme.bottomNavBorder,
        },
      ]}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        const color = isActive ? theme.textPrimary : theme.textMuted;

        return (
          <TouchableOpacity
            key={tab.id}
            style={styles.tabItem}
            onPress={() => handleTabPress(tab.id)}
            activeOpacity={0.7}
          >
            {isActive && (
              <View
                style={[
                  styles.activeIndicator,
                  { backgroundColor: theme.textPrimary },
                ]}
              />
            )}
            <Ionicons
              name={isActive ? tab.iconActive : tab.icon}
              size={21}
              color={color}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: color,
                  fontWeight: isActive ? '700' : '500',
                },
              ]}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 8,
    // Generous bottom inset for Android 3-button nav or gesture pill
    paddingBottom: Platform.OS === 'android' ? 44 : 26,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    paddingHorizontal: 16,
    position: 'relative',
    minWidth: 70,
  },
  activeIndicator: {
    position: 'absolute',
    top: -8,
    width: 26,
    height: 3,
    borderRadius: 2,
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 3,
    letterSpacing: 0.2,
  },
});
