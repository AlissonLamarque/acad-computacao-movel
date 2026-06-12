import { Pressable, StyleSheet } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { CompactContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { useTheme } from '@/hooks/use-theme';

export default function SettingsScreen() {
  const { googleAccessToken, signOut, user } = useAuth();
  const theme = useTheme();

  return (
    <ScreenShell maxWidth={CompactContentWidth} subtitle={user?.email ?? undefined} title="Ajustes">
      <ThemedView type="backgroundElement" style={[styles.statusBox, { borderColor: theme.border }]}>
        <ThemedText type="smallBold">Google Agenda</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {googleAccessToken ? 'Conectada nesta sessao' : 'Aguardando novo consentimento'}
        </ThemedText>
      </ThemedView>

      <Pressable
        accessibilityRole="button"
        onPress={signOut}
        style={({ pressed }) => [
          styles.signOutButton,
          { backgroundColor: theme.danger },
          pressed && styles.signOutButtonPressed,
        ]}>
        <ThemedText style={styles.signOutButtonText}>Sair</ThemedText>
      </Pressable>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  statusBox: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  signOutButton: {
    minHeight: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutButtonPressed: {
    opacity: 0.82,
  },
  signOutButtonText: {
    color: '#ffffff',
    fontWeight: 700,
  },
});
