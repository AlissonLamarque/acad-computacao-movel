import { Redirect, Tabs } from 'expo-router';
import { ActivityIndicator, StyleSheet, useColorScheme, type ColorValue } from 'react-native';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Colors, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';

type TabIconName = 'calendar' | 'checklist' | 'house' | 'plus' | 'settings';

const DesktopTabBarWidth = 780;

const tabIconNames = {
  calendar: {
    android: 'calendar_month',
    ios: 'calendar',
    web: 'calendar_month',
  },
  checklist: {
    android: 'checklist',
    ios: 'checklist',
    web: 'checklist',
  },
  house: {
    android: 'home',
    ios: 'house',
    web: 'home',
  },
  plus: {
    android: 'add_circle',
    ios: 'plus.circle',
    web: 'add_circle',
  },
  settings: {
    android: 'settings',
    ios: 'gearshape',
    web: 'settings',
  },
} satisfies Record<TabIconName, SymbolViewProps['name']>;

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
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
          borderRadius: isDesktop ? Spacing.two : 0,
          borderTopColor: colors.border,
          borderWidth: isDesktop ? 1 : 0,
          borderTopWidth: 1,
          bottom: isDesktop ? Spacing.three : 0,
          height: isDesktop ? 64 : 68,
          left: isDesktop ? '50%' : undefined,
          marginLeft: isDesktop ? -DesktopTabBarWidth / 2 : undefined,
          minHeight: isDesktop ? 64 : 68,
          paddingBottom: isDesktop ? Spacing.one : Spacing.two,
          paddingTop: Spacing.one,
          position: isDesktop ? 'absolute' : 'relative',
          width: isDesktop ? DesktopTabBarWidth : '100%',
        },
        tabBarItemStyle: {
          minWidth: 0,
          paddingHorizontal: 0,
        },
        tabBarLabelStyle: {
          fontSize: isDesktop ? 12 : 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ color }) => <TabIcon color={color} name="house" />,
          title: 'Hoje',
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          tabBarIcon: ({ color }) => <TabIcon color={color} name="plus" />,
          title: 'Criar',
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          tabBarIcon: ({ color }) => <TabIcon color={color} name="checklist" />,
          title: 'Tarefas',
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          href: '/calendar',
          tabBarIcon: ({ color }) => <TabIcon color={color} name="calendar" />,
          title: 'Agenda',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          tabBarIcon: ({ color }) => <TabIcon color={color} name="settings" />,
          title: 'Ajustes',
        }}
      />
    </Tabs>
  );
}

function TabIcon({ color, name }: { color: ColorValue; name: TabIconName }) {
  return (
    <SymbolView
      fallback={
        <ThemedText type="smallBold" style={{ color }}>
          {name.charAt(0).toUpperCase()}
        </ThemedText>
      }
      name={tabIconNames[name]}
      size={19}
      tintColor={color}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
