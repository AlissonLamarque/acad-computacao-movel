import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { useCalendarFreeBusy } from '@/features/calendar/use-calendar-freebusy';
import { calculateTaskPriority } from '@/features/prioritization/calculate-priority';
import { TaskCard } from '@/features/tasks/task-card';
import { useTasks } from '@/features/tasks/use-tasks';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useTheme } from '@/hooks/use-theme';

export default function TodayScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const { googleAccessToken, user } = useAuth();
  const { createTask, deleteTask, errorMessage, filteredTasks, isLoading, isSaving, setTaskStatus } =
    useTasks(user?.uid);
  const calendar = useCalendarFreeBusy(googleAccessToken);
  const { isDesktop } = useResponsiveLayout();
  const theme = useTheme();

  const displayTasks = useMemo(
    () =>
      filteredTasks.map((task) => ({
        adjustedScore: calendar.summary
          ? calculateTaskPriority(task, { calendar: calendar.summary }).priorityScore
          : undefined,
        task,
      })),
    [calendar.summary, filteredTasks]
  );

  async function captureTask() {
    const title = draft.trim();

    if (!title) {
      return;
    }

    await createTask(title);
    setDraft('');
  }

  const subtitle = calendar.summary
    ? `Agenda carregada: maior janela livre ${calendar.summary.largestFreeWindowMinutes}min`
    : 'Prioridade por prazo, tags e tempo estimado.';

  return (
    <ScreenShell
      actions={
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push('/create')}
          style={({ pressed }) => [
            styles.createButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={[styles.createButtonText, { color: theme.background }]}>
            Nova tarefa
          </ThemedText>
        </Pressable>
      }
      subtitle={subtitle}
      title="Hoje">
      <View style={[styles.dashboardGrid, isDesktop && styles.dashboardGridDesktop]}>
        <View style={[styles.leftColumn, isDesktop && styles.leftColumnDesktop]}>
          <ThemedView
            type="backgroundElement"
            style={[styles.captureBox, { borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">Braindump</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Entrada rapida
              </ThemedText>
            </View>
            <TextInput
              multiline
              onChangeText={setDraft}
              placeholder="Ex: revisar prova #faculdade amanha 40min"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
                isDesktop && styles.inputDesktop,
              ]}
              value={draft}
            />
            <Pressable
              accessibilityRole="button"
              disabled={isSaving}
              onPress={captureTask}
              style={({ pressed }) => [
                styles.captureButton,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
                isSaving && styles.disabledButton,
              ]}>
              {isSaving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <ThemedText style={styles.captureButtonText}>Registrar</ThemedText>
              )}
            </Pressable>
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.calendarBox, { borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">Agenda</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {calendar.summary
                  ? `${calendar.summary.busyMinutesToday}min ocupados hoje`
                  : 'Disponibilidade'}
              </ThemedText>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={calendar.isLoading}
              onPress={calendar.refresh}
              style={({ pressed }) => [
                styles.calendarButton,
                { backgroundColor: theme.primarySoft },
                pressed && styles.pressed,
                calendar.isLoading && styles.disabledButton,
              ]}>
              <ThemedText type="smallBold" style={{ color: theme.text }}>
                {calendar.isLoading ? 'Atualizando...' : 'Atualizar agenda'}
              </ThemedText>
            </Pressable>
          </ThemedView>
        </View>

        <View style={styles.taskColumn}>
          <View style={styles.listHeader}>
            <ThemedText type="smallBold">Fila priorizada</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {displayTasks.length} ativas
            </ThemedText>
          </View>

          {(errorMessage || calendar.errorMessage) && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {errorMessage ?? calendar.errorMessage}
            </ThemedText>
          )}

          <View style={styles.list}>
            {isLoading ? (
              <ActivityIndicator />
            ) : displayTasks.length === 0 ? (
              <ThemedView
                type="backgroundElement"
                style={[styles.emptyState, { borderColor: theme.border }]}>
                <ThemedText type="small" themeColor="textSecondary">
                  Nenhuma tarefa ativa.
                </ThemedText>
              </ThemedView>
            ) : (
              displayTasks.map(({ adjustedScore, task }) => (
                <TaskCard
                  adjustedScore={adjustedScore}
                  key={task.id}
                  onDelete={deleteTask}
                  onToggleDone={(selectedTask) => {
                    void setTaskStatus(
                      selectedTask.id,
                      selectedTask.status === 'done' ? 'inbox' : 'done'
                    );
                  }}
                  task={task}
                />
              ))
            )}
          </View>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  calendarBox: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  calendarButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 42,
    paddingHorizontal: Spacing.three,
  },
  captureBox: {
    borderWidth: 1,
    borderRadius: Spacing.two,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  captureButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  captureButtonText: {
    color: '#ffffff',
    fontWeight: 700,
  },
  createButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  createButtonText: {
    color: '#ffffff',
  },
  dashboardGrid: {
    gap: Spacing.four,
  },
  dashboardGridDesktop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  disabledButton: {
    opacity: 0.55,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 108,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 96,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  inputDesktop: {
    minHeight: 120,
  },
  leftColumn: {
    gap: Spacing.three,
  },
  leftColumnDesktop: {
    flex: 0.82,
    maxWidth: 430,
    minWidth: 340,
  },
  list: {
    gap: Spacing.two,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  pressed: {
    opacity: 0.82,
  },
  sectionHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  taskColumn: {
    flex: 1,
    gap: Spacing.two,
    minWidth: 0,
  },
});
