/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#111827',
    background: '#f6f7f9',
    backgroundElement: '#ffffff',
    backgroundSelected: '#e8eef7',
    border: '#d9dee7',
    primary: '#2563eb',
    primarySoft: '#dbeafe',
    danger: '#dc2626',
    dangerSoft: '#fee2e2',
    textSecondary: '#667085',
  },
  dark: {
    text: '#f8fafc',
    background: '#101113',
    backgroundElement: '#181b20',
    backgroundSelected: '#242933',
    border: '#303642',
    primary: '#60a5fa',
    primarySoft: '#1e3a5f',
    danger: '#f87171',
    dangerSoft: '#4a1d21',
    textSecondary: '#a3aab8',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
export const DesktopBreakpoint = 900;
export const WideContentWidth = 1120;
export const FormContentWidth = 1040;
export const CompactContentWidth = 680;
