import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { ThemeColors } from '../theme';

export type FilterCategory = 'all' | 'readiness' | 'stats' | 'activity' | 'settings';

interface CategoryPillsProps {
  theme: ThemeColors;
  isDark: boolean;
  selectedCategory: FilterCategory;
  onSelectCategory: (cat: FilterCategory) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  theme,
  isDark,
  selectedCategory,
  onSelectCategory,
}) => {
  const categories: { id: FilterCategory; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'readiness', label: 'Readiness' },
    { id: 'stats', label: 'Stats' },
    { id: 'activity', label: 'Activity' },
    { id: 'settings', label: 'Settings' },
  ];

  const handlePress = (id: FilterCategory) => {
    try {
      Haptics.selectionAsync();
    } catch {}
    onSelectCategory(id);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
        Choose a section
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat.id;

          const pillBg = isSelected
            ? isDark
              ? '#FFFFFF'
              : '#111827'
            : isDark
            ? '#161F2A'
            : '#EFEFEF';

          const textColor = isSelected
            ? isDark
              ? '#0F172A'
              : '#FFFFFF'
            : theme.textSecondary;

          const borderColor = isSelected
            ? 'transparent'
            : isDark
            ? '#222C3A'
            : '#E4E7EC';

          return (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.pill,
                {
                  backgroundColor: pillBg,
                  borderColor: borderColor,
                },
              ]}
              onPress={() => handlePress(cat.id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.pillText,
                  {
                    color: textColor,
                    fontWeight: isSelected ? '700' : '500',
                  },
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 18,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    marginHorizontal: 20,
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
