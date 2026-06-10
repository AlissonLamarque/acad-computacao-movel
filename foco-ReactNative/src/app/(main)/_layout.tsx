import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, useColorScheme } from 'react-native';

import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

export default function MainLayout() {
  const { isLoading, user } = useAuth();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme === 'dark' ? 'dark' : 'light'];
  const { isDesktop } = useResponsiveLayout();

  if (isLoading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          alignSelf: 'center',
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
          borderRadius: isDesktop ? Spacing.two : 0,
          borderTopColor: colors.border,
          borderWidth: isDesktop ? 1 : 0,
          borderTopWidth: 1,
          bottom: isDesktop ? Spacing.three : 0,
          height: isDesktop ? 58 : 64,
          maxWidth: isDesktop ? 680 : undefined,
          minHeight: isDesktop ? 58 : 64,
          paddingBottom: isDesktop ? Spacing.one : Spacing.two,
          paddingTop: Spacing.one,
          position: isDesktop ? 'absolute' : 'relative',
          width: isDesktop ? '92%' : '100%',
        },
        tabBarItemStyle: {
          maxWidth: isDesktop ? 132 : undefined,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Hoje' }} />
      <Tabs.Screen name="create" options={{ title: 'Criar' }} />
      <Tabs.Screen name="tasks" options={{ title: 'Tarefas' }} />
      <Tabs.Screen name="calendar" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="settings" options={{ title: 'Ajustes' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
