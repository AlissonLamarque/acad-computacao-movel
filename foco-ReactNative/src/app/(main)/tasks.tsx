import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { TaskCard } from '@/features/tasks/task-card';
import { TaskFilter, useTasks } from '@/features/tasks/use-tasks';
import { useTheme } from '@/hooks/use-theme';

const filters: { label: string; value: TaskFilter }[] = [
  { label: 'Todas', value: 'all' },
  { label: 'Hoje', value: 'today' },
  { label: 'Inbox', value: 'inbox' },
  { label: 'Concluidas', value: 'done' },
];

export default function TasksScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<TaskFilter>('all');
  const { user } = useAuth();
  const theme = useTheme();
  const { deleteTask, errorMessage, filteredTasks, isLoading, setTaskStatus } = useTasks(
    user?.uid,
    filter
  );

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
            Criar
          </ThemedText>
        </Pressable>
      }
      maxWidth={900}
      subtitle={`${filteredTasks.length} itens no filtro`}
      title="Tarefas">
      <ThemedView type="backgroundElement" style={[styles.filtersPanel, { borderColor: theme.border }]}>
        <View style={styles.filters}>
          {filters.map((filterOption) => {
            const isSelected = filterOption.value === filter;

            return (
              <Pressable
                accessibilityRole="button"
                key={filterOption.value}
                onPress={() => setFilter(filterOption.value)}
                style={({ pressed }) => [
                  styles.filterButton,
                  { borderColor: theme.border },
                  isSelected && { backgroundColor: theme.text, borderColor: theme.text },
                  pressed && styles.pressed,
                ]}>
                <ThemedText
                  type="smallBold"
                  style={isSelected && { color: theme.background }}>
                  {filterOption.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </ThemedView>

      {errorMessage && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {errorMessage}
        </ThemedText>
      )}

      <View style={styles.list}>
        {isLoading ? (
          <ActivityIndicator />
        ) : filteredTasks.length === 0 ? (
          <ThemedView type="backgroundElement" style={[styles.emptyState, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma tarefa encontrada.
            </ThemedText>
          </ThemedView>
        ) : (
          filteredTasks.map((task) => (
            <TaskCard
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
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
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
  emptyState: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 116,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  filterButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  filtersPanel: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.two,
  },
  list: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
});
