import { useMemo, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { defaultCategories, getCategoryById } from '@/features/categories/default-categories';
import { TaskCard } from '@/features/tasks/task-card';
import type { Task } from '@/features/tasks/task.types';
import { useTasks } from '@/features/tasks/use-tasks';
import { useTheme } from '@/hooks/use-theme';

type StatusFilter = 'active' | 'all' | 'inbox' | 'planned' | 'done';
type DueFilter = 'all' | 'today' | 'overdue' | 'upcoming' | 'no-date';
type SortOption = 'priority-desc' | 'due-asc' | 'created-desc' | 'estimate-asc' | 'title-asc';

const statusFilters: { label: string; value: StatusFilter }[] = [
  { label: 'Ativas', value: 'active' },
  { label: 'Todas', value: 'all' },
  { label: 'Inbox', value: 'inbox' },
  { label: 'Planejadas', value: 'planned' },
  { label: 'Concluidas', value: 'done' },
];

const dueFilters: { label: string; value: DueFilter }[] = [
  { label: 'Qualquer prazo', value: 'all' },
  { label: 'Hoje', value: 'today' },
  { label: 'Atrasadas', value: 'overdue' },
  { label: 'Proximas', value: 'upcoming' },
  { label: 'Sem prazo', value: 'no-date' },
];

const sortOptions: { label: string; value: SortOption }[] = [
  { label: 'Prioridade', value: 'priority-desc' },
  { label: 'Prazo', value: 'due-asc' },
  { label: 'Mais recentes', value: 'created-desc' },
  { label: 'Tempo', value: 'estimate-asc' },
  { label: 'Titulo', value: 'title-asc' },
];

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function compareNullableNumbers(firstValue: number | null, secondValue: number | null) {
  if (firstValue === null && secondValue === null) {
    return 0;
  }

  if (firstValue === null) {
    return 1;
  }

  if (secondValue === null) {
    return -1;
  }

  return firstValue - secondValue;
}

function getDateTime(dateValue: string | null) {
  if (!dateValue) {
    return null;
  }

  const time = new Date(dateValue).getTime();
  return Number.isNaN(time) ? null : time;
}

function getDateOnlyTime(dateValue: string | null) {
  if (!dateValue) {
    return null;
  }

  const [year, month, day] = dateValue.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day).getTime();
}

function matchesStatus(task: Task, statusFilter: StatusFilter) {
  if (statusFilter === 'active') {
    return task.status !== 'done';
  }

  if (statusFilter === 'all') {
    return true;
  }

  return task.status === statusFilter;
}

function matchesDueDate(task: Task, dueFilter: DueFilter, today: string) {
  if (dueFilter === 'all') {
    return true;
  }

  if (dueFilter === 'no-date') {
    return !task.dueDate;
  }

  if (!task.dueDate) {
    return false;
  }

  if (dueFilter === 'today') {
    return task.dueDate === today;
  }

  if (dueFilter === 'overdue') {
    return task.dueDate < today && task.status !== 'done';
  }

  return task.dueDate > today && task.status !== 'done';
}

function sortTasks(tasks: Task[], sortOption: SortOption) {
  return [...tasks].sort((firstTask, secondTask) => {
    if (sortOption === 'due-asc') {
      const dueComparison = compareNullableNumbers(
        getDateOnlyTime(firstTask.dueDate),
        getDateOnlyTime(secondTask.dueDate)
      );

      return dueComparison || secondTask.priorityScore - firstTask.priorityScore;
    }

    if (sortOption === 'created-desc') {
      return (
        compareNullableNumbers(getDateTime(secondTask.createdAt), getDateTime(firstTask.createdAt)) ||
        secondTask.priorityScore - firstTask.priorityScore
      );
    }

    if (sortOption === 'estimate-asc') {
      return (
        compareNullableNumbers(firstTask.estimatedMinutes, secondTask.estimatedMinutes) ||
        secondTask.priorityScore - firstTask.priorityScore
      );
    }

    if (sortOption === 'title-asc') {
      return firstTask.title.localeCompare(secondTask.title, 'pt-BR');
    }

    return secondTask.priorityScore - firstTask.priorityScore;
  });
}

export default function TasksScreen() {
  const router = useRouter();
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dueFilter, setDueFilter] = useState<DueFilter>('all');
  const [isFiltersExpanded, setIsFiltersExpanded] = useState(false);
  const [sortOption, setSortOption] = useState<SortOption>('priority-desc');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const { user } = useAuth();
  const theme = useTheme();
  const { deleteTask, errorMessage, isLoading, setTaskStatus, tasks } = useTasks(user?.uid);
  const today = useMemo(() => toDateOnly(new Date()), []);
  const categoryOptions = useMemo(
    () => {
      const unknownCategories = Array.from(
        new Set(
          tasks
            .map((task) => task.category)
            .filter((category): category is string => Boolean(category))
            .filter((category) => !getCategoryById(category))
        )
      );

      return [
        { color: undefined, label: 'Todas', value: 'all' },
        { color: undefined, label: 'Sem categoria', value: 'uncategorized' },
        ...defaultCategories.map((category) => ({
          color: category.color,
          label: category.label,
          value: category.id,
        })),
        ...unknownCategories.map((category) => ({
          color: '#64748b',
          label: category,
          value: category,
        })),
      ];
    },
    [tasks]
  );
  const displayedTasks = useMemo(
    () =>
      sortTasks(
        tasks.filter((task) => {
          const matchesCategory =
            categoryFilter === 'all' ||
            (categoryFilter === 'uncategorized' ? !task.category : task.category === categoryFilter);

          return (
            matchesStatus(task, statusFilter) &&
            matchesDueDate(task, dueFilter, today) &&
            matchesCategory
          );
        }),
        sortOption
      ),
    [categoryFilter, dueFilter, sortOption, statusFilter, tasks, today]
  );
  const hasActiveControls =
    categoryFilter !== 'all' ||
    dueFilter !== 'all' ||
    sortOption !== 'priority-desc' ||
    statusFilter !== 'active';
  const controlsSummary = useMemo(() => {
    const statusLabel =
      statusFilters.find((filterOption) => filterOption.value === statusFilter)?.label ?? 'Ativas';
    const dueLabel =
      dueFilters.find((filterOption) => filterOption.value === dueFilter)?.label ?? 'Qualquer prazo';
    const categoryLabel =
      categoryOptions.find((filterOption) => filterOption.value === categoryFilter)?.label ?? 'Todas';
    const sortLabel =
      sortOptions.find((option) => option.value === sortOption)?.label ?? 'Prioridade';

    return `${statusLabel} - ${dueLabel} - ${categoryLabel} - ${sortLabel}`;
  }, [categoryFilter, categoryOptions, dueFilter, sortOption, statusFilter]);

  function resetControls() {
    setCategoryFilter('all');
    setDueFilter('all');
    setSortOption('priority-desc');
    setStatusFilter('active');
  }

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
      subtitle={`${displayedTasks.length} de ${tasks.length} tarefas`}
      title="Tarefas">
      <ThemedView type="backgroundElement" style={[styles.filtersPanel, { borderColor: theme.border }]}>
        <View style={styles.filtersHeader}>
          <View style={styles.filtersHeaderCopy}>
            <ThemedText type="smallBold">Filtros e ordenacao</ThemedText>
            {!isFiltersExpanded && (
              <ThemedText type="small" themeColor="textSecondary" style={styles.controlsSummary}>
                {controlsSummary}
              </ThemedText>
            )}
          </View>
          <View style={styles.filtersHeaderActions}>
            {hasActiveControls && (
              <Pressable
                accessibilityRole="button"
                onPress={resetControls}
                style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Limpar
                </ThemedText>
              </Pressable>
            )}
            <Pressable
              accessibilityRole="button"
              onPress={() => setIsFiltersExpanded((isExpanded) => !isExpanded)}
              style={({ pressed }) => [
                styles.toggleButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">
                {isFiltersExpanded ? 'Recolher' : 'Expandir'}
              </ThemedText>
              <SymbolView
                fallback={
                  <ThemedText style={styles.toggleIconFallback}>
                    {isFiltersExpanded ? '^' : 'v'}
                  </ThemedText>
                }
                name={{
                  android: isFiltersExpanded ? 'expand_less' : 'expand_more',
                  ios: isFiltersExpanded ? 'chevron.up' : 'chevron.down',
                  web: isFiltersExpanded ? 'expand_less' : 'expand_more',
                }}
                size={18}
                tintColor={theme.text}
              />
            </Pressable>
          </View>
        </View>

        {isFiltersExpanded && (
          <>
            <FilterGroup label="Status">
              {statusFilters.map((filterOption) => (
                <FilterChip
                  isSelected={filterOption.value === statusFilter}
                  key={filterOption.value}
                  label={filterOption.label}
                  onPress={() => setStatusFilter(filterOption.value)}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="Prazo">
              {dueFilters.map((filterOption) => (
                <FilterChip
                  isSelected={filterOption.value === dueFilter}
                  key={filterOption.value}
                  label={filterOption.label}
                  onPress={() => setDueFilter(filterOption.value)}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="Categoria">
              {categoryOptions.map((filterOption) => (
                <FilterChip
                  color={filterOption.color}
                  isSelected={filterOption.value === categoryFilter}
                  key={filterOption.value}
                  label={filterOption.label}
                  onPress={() => setCategoryFilter(filterOption.value)}
                />
              ))}
            </FilterGroup>

            <FilterGroup label="Ordenar por">
              {sortOptions.map((option) => (
                <FilterChip
                  isSelected={option.value === sortOption}
                  key={option.value}
                  label={option.label}
                  onPress={() => setSortOption(option.value)}
                />
              ))}
            </FilterGroup>
          </>
        )}
      </ThemedView>

      {errorMessage && (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {errorMessage}
        </ThemedText>
      )}

      <View style={styles.list}>
        {isLoading ? (
          <ActivityIndicator />
        ) : displayedTasks.length === 0 ? (
          <ThemedView type="backgroundElement" style={[styles.emptyState, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Nenhuma tarefa encontrada.
            </ThemedText>
          </ThemedView>
        ) : (
          displayedTasks.map((task) => (
            <TaskCard
              key={task.id}
              onDelete={deleteTask}
              onEdit={(selectedTask) => {
                router.push(`/create?taskId=${encodeURIComponent(selectedTask.id)}`);
              }}
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

function FilterGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <View style={styles.filterGroup}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.filterLabel}>
        {label}
      </ThemedText>
      <View style={styles.filters}>{children}</View>
    </View>
  );
}

function FilterChip({
  color,
  isSelected,
  label,
  onPress,
}: {
  color?: string;
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  const theme = useTheme();
  const selectedBackground = color ?? theme.text;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,
        { borderColor: color ?? theme.border },
        isSelected && { backgroundColor: selectedBackground, borderColor: selectedBackground },
        pressed && styles.pressed,
      ]}>
      <ThemedText type="smallBold" style={isSelected && { color: theme.background }}>
        {label}
      </ThemedText>
    </Pressable>
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
  controlsSummary: {
    flexShrink: 1,
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: Spacing.two,
  },
  emptyState: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    minHeight: 116,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  filterGroup: {
    gap: Spacing.one,
  },
  filterLabel: {
    textTransform: 'uppercase',
  },
  filterButton: {
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: Spacing.two,
    minHeight: 36,
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  filtersHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  filtersHeaderActions: {
    alignItems: 'center',
    flexDirection: 'row',
    flexShrink: 0,
    flexWrap: 'wrap',
    gap: Spacing.one,
    justifyContent: 'flex-end',
  },
  filtersHeaderCopy: {
    flex: 1,
    gap: Spacing.half,
    minWidth: 0,
  },
  filtersPanel: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.three,
    padding: Spacing.three,
  },
  list: {
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.8,
  },
  toggleButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: Spacing.two,
  },
  toggleIconFallback: {
    fontSize: 14,
    fontWeight: 700,
    lineHeight: 16,
    textAlign: 'center',
  },
});
