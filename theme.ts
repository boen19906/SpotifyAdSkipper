import { Platform, StatusBar } from 'react-native';

export const ANDROID_STATUS_BAR_HEIGHT =
  Platform.OS === 'android' ? (StatusBar.currentHeight ?? 28) : 0;

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSubtle: string;
  surfaceElevated: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSubtle: string;
  accentText: string;
  danger: string;
  dangerSubtle: string;
  warning: string;
  warningSubtle: string;
  success: string;
  successSubtle: string;
  heroBackground: string;
  heroBorder: string;
  heroTextPrimary: string;
  heroTextSecondary: string;
  heroBadgeBg: string;
  heroBadgeText: string;
  bottomNavBg: string;
  bottomNavBorder: string;
}

export const lightTheme: ThemeColors = {
  background: '#F7F8F9',
  surface: '#FFFFFF',
  surfaceSubtle: '#F1F3F5',
  surfaceElevated: '#FFFFFF',
  border: '#E5E7EB',
  borderSubtle: '#F0F2F5',
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  accent: '#1DB954',
  accentSubtle: '#E8F8EE',
  accentText: '#0F7638',
  danger: '#EF4444',
  dangerSubtle: '#FEF2F2',
  warning: '#F59E0B',
  warningSubtle: '#FFFBEB',
  success: '#10B981',
  successSubtle: '#ECFDF5',
  heroBackground: '#0F1A24',
  heroBorder: '#1E2D3D',
  heroTextPrimary: '#FFFFFF',
  heroTextSecondary: '#94A3B8',
  heroBadgeBg: 'rgba(255, 255, 255, 0.14)',
  heroBadgeText: '#F1F5F9',
  bottomNavBg: '#FFFFFF',
  bottomNavBorder: '#E5E7EB',
};

export const darkTheme: ThemeColors = {
  background: '#0B0F14',
  surface: '#121820',
  surfaceSubtle: '#18202A',
  surfaceElevated: '#1D2733',
  border: '#232D3B',
  borderSubtle: '#19222D',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textMuted: '#64748B',
  accent: '#1DB954',
  accentSubtle: '#0D2B1B',
  accentText: '#1ED760',
  danger: '#EF4444',
  dangerSubtle: '#2E1515',
  warning: '#F59E0B',
  warningSubtle: '#2E2211',
  success: '#10B981',
  successSubtle: '#0F2E22',
  heroBackground: '#09121A',
  heroBorder: '#1A2938',
  heroTextPrimary: '#FFFFFF',
  heroTextSecondary: '#94A3B8',
  heroBadgeBg: 'rgba(255, 255, 255, 0.12)',
  heroBadgeText: '#E2E8F0',
  bottomNavBg: '#0F141C',
  bottomNavBorder: '#1E2633',
};
