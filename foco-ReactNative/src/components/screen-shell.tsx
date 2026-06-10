import type { ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  type ScrollViewProps,
  type StyleProp,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, WideContentWidth } from '@/constants/theme';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type ScreenShellProps = {
  actions?: ReactNode;
  children: ReactNode;
  contentStyle?: StyleProp<ViewStyle>;
  maxWidth?: number;
  scrollViewProps?: Omit<ScrollViewProps, 'contentContainerStyle'>;
  subtitle?: string;
  title?: string;
};

export function ScreenShell({
  actions,
  children,
  contentStyle,
  maxWidth = WideContentWidth,
  scrollViewProps,
  subtitle,
  title,
}: ScreenShellProps) {
  const { isDesktop } = useResponsiveLayout();

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.safeArea}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          {...scrollViewProps}
          style={styles.scroller}
          contentContainerStyle={[
            styles.scrollContent,
            isDesktop ? styles.scrollContentDesktop : styles.scrollContentMobile,
          ]}>
          <View style={[styles.inner, { maxWidth }, contentStyle]}>
            {(title || subtitle || actions) && (
              <View style={[styles.header, isDesktop ? styles.headerDesktop : styles.headerMobile]}>
                <View style={styles.headerCopy}>
                  {title && <ThemedText type="subtitle">{title}</ThemedText>}
                  {subtitle && (
                    <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                      {subtitle}
                    </ThemedText>
                  )}
                </View>
                {actions && (
                  <View style={[styles.actions, !isDesktop && styles.actionsMobile]}>
                    {actions}
                  </View>
                )}
              </View>
            )}
            {children}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  actions: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  actionsMobile: {
    alignItems: 'stretch',
  },
  container: {
    flex: 1,
  },
  header: {
    gap: Spacing.three,
  },
  headerCopy: {
    flex: 1,
    gap: Spacing.one,
  },
  headerDesktop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerMobile: {
    flexDirection: 'column',
  },
  inner: {
    gap: Spacing.four,
    width: '100%',
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    flexGrow: 1,
  },
  scroller: {
    flex: 1,
  },
  scrollContentDesktop: {
    paddingBottom: 112,
    paddingHorizontal: Spacing.five,
    paddingTop: Spacing.five,
  },
  scrollContentMobile: {
    paddingBottom: 96,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
  subtitle: {
    maxWidth: 640,
  },
});
