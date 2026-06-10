import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { useCalendarFreeBusy } from '@/features/calendar/use-calendar-freebusy';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useTheme } from '@/hooks/use-theme';

function formatTime(dateValue: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

function formatMinutes(minutes: number) {
  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
}

export default function CalendarScreen() {
  const { googleAccessToken } = useAuth();
  const { errorMessage, isLoading, refresh, summary } = useCalendarFreeBusy(googleAccessToken);
  const { isDesktop } = useResponsiveLayout();
  const theme = useTheme();

  const subtitle = summary
    ? `${formatMinutes(summary.busyMinutesToday)} ocupados hoje`
    : googleAccessToken
      ? 'Pronto para consultar disponibilidade.'
      : 'Entre novamente para liberar a Agenda.';

  return (
    <ScreenShell
      actions={
        <Pressable
          accessibilityRole="button"
          disabled={isLoading}
          onPress={refresh}
          style={({ pressed }) => [
            styles.refreshButton,
            { backgroundColor: theme.primary },
            pressed && styles.pressed,
            isLoading && styles.disabledButton,
          ]}>
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <ThemedText style={styles.refreshButtonText}>Atualizar disponibilidade</ThemedText>
          )}
        </Pressable>
      }
      maxWidth={920}
      subtitle={subtitle}
      title="Agenda">
      {errorMessage && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {errorMessage}
        </ThemedText>
      )}

      {summary ? (
        <View style={[styles.grid, isDesktop && styles.gridDesktop]}>
          <ThemedView
            type="backgroundElement"
            style={[
              styles.summaryBox,
              !isDesktop && styles.summaryBoxMobile,
              { borderColor: theme.border },
            ]}>
            <ThemedText type="smallBold">Maior janela livre</ThemedText>
            <ThemedText type="subtitle">{formatMinutes(summary.largestFreeWindowMinutes)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {formatMinutes(summary.busyMinutesToday)} ja bloqueados no calendario
            </ThemedText>
          </ThemedView>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">Janelas livres</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Proximas 6
              </ThemedText>
            </View>
            {summary.freeWindows.slice(0, 6).map((window) => (
              <ThemedView
                key={`${window.start}-${window.end}`}
                type="backgroundElement"
                style={[styles.row, { borderColor: theme.border }]}>
                <ThemedText>
                  {formatTime(window.start)} - {formatTime(window.end)}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatMinutes(window.minutes)}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        </View>
      ) : (
        <ThemedView type="backgroundElement" style={[styles.emptyState, { borderColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            Atualize a disponibilidade para ver suas janelas livres.
          </ThemedText>
        </ThemedView>
      )}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  disabledButton: {
    opacity: 0.55,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 132,
    padding: Spacing.three,
  },
  grid: {
    gap: Spacing.four,
  },
  gridDesktop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  pressed: {
    opacity: 0.82,
  },
  refreshButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  refreshButtonText: {
    color: '#ffffff',
    fontWeight: 700,
  },
  row: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  section: {
    flex: 1,
    gap: Spacing.two,
    minWidth: 0,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  summaryBox: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.three,
    width: 280,
  },
  summaryBoxMobile: {
    width: '100%',
  },
});
