import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { useTheme } from '@/hooks/use-theme';

export default function LoginScreen() {
  const { canSignInWithGoogle, errorMessage, isSigningIn, signInWithGoogle } = useAuth();
  const theme = useTheme();
  const disabled = !canSignInWithGoogle || isSigningIn;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView
          type="backgroundElement"
          style={[styles.content, { borderColor: theme.border }]}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>
              Foco
            </ThemedText>
            <ThemedText themeColor="textSecondary" style={styles.subtitle}>
              Capture tarefas rapido e deixe a prioridade ganhar forma.
            </ThemedText>
          </View>

          <Pressable
            accessibilityRole="button"
            disabled={disabled}
            onPress={signInWithGoogle}
            style={({ pressed }) => [
              styles.googleButton,
              { backgroundColor: theme.primary },
              pressed && !disabled && styles.googleButtonPressed,
              disabled && styles.googleButtonDisabled,
            ]}>
            {isSigningIn ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <ThemedText style={[styles.googleButtonIcon, { color: theme.primary }]}>G</ThemedText>
                <ThemedText style={styles.googleButtonText}>Entrar com Google</ThemedText>
              </>
            )}
          </Pressable>

          {!canSignInWithGoogle && (
            <ThemedText type="small" themeColor="textSecondary" style={styles.helperText}>
              Configure Firebase e os client IDs do Google no arquivo .env.local.
            </ThemedText>
          )}

          {errorMessage && (
            <ThemedText type="small" style={styles.errorText}>
              {errorMessage}
            </ThemedText>
          )}
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
  },
  content: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.four,
    maxWidth: 430,
    padding: Spacing.four,
    width: '100%',
  },
  header: {
    gap: Spacing.two,
  },
  title: {
    textAlign: 'left',
  },
  subtitle: {
    maxWidth: 320,
  },
  googleButton: {
    minHeight: 56,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  googleButtonPressed: {
    opacity: 0.82,
  },
  googleButtonDisabled: {
    opacity: 0.52,
  },
  googleButtonIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
    textAlign: 'center',
    lineHeight: 24,
    fontWeight: 700,
  },
  googleButtonText: {
    color: '#ffffff',
    fontWeight: 700,
  },
  helperText: {
    textAlign: 'center',
  },
  errorText: {
    color: '#d1242f',
    textAlign: 'center',
  },
});
