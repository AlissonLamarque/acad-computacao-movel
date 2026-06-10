import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { FormContentWidth, Spacing } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import { defaultCategories } from '@/features/categories/default-categories';
import type { Task } from '@/features/tasks/task.types';
import { useTasks } from '@/features/tasks/use-tasks';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useTheme } from '@/hooks/use-theme';

const quickEstimateOptions = [15, 30, 45, 60, 90, 120];
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatDate(dateValue: string | null) {
  if (!dateValue) {
    return 'Sem prazo';
  }

  const [year, month, day] = dateValue.split('-');
  return `${day}/${month}/${year}`;
}

function formatEstimate(minutes: number | null) {
  if (!minutes) {
    return 'Sem estimativa';
  }

  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
}

function getMonthTitle(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(date);
}

function getCalendarDays(month: Date) {
  const firstDay = new Date(month.getFullYear(), month.getMonth(), 1);
  const lastDay = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: (Date | null)[] = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= lastDay.getDate(); day += 1) {
    days.push(new Date(month.getFullYear(), month.getMonth(), day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function normalizeTags(input: string) {
  return input
    .split(',')
    .map((tag) => tag.trim().replace(/^#/, ''))
    .filter(Boolean);
}

export default function CreateTaskScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ taskId?: string | string[] }>();
  const theme = useTheme();
  const { user } = useAuth();
  const taskState = useTasks(user?.uid);
  const taskId = Array.isArray(params.taskId) ? params.taskId[0] : params.taskId;
  const editingTask = useMemo(
    () => (taskId ? (taskState.tasks.find((task) => task.id === taskId) ?? null) : null),
    [taskId, taskState.tasks]
  );

  if (taskId && !editingTask) {
    return (
      <ScreenShell
        maxWidth={FormContentWidth}
        subtitle={taskState.isLoading ? 'Carregando tarefa...' : 'Tarefa nao encontrada'}
        title="Editar tarefa">
        {taskState.isLoading ? (
          <ActivityIndicator />
        ) : (
          <ThemedView
            type="backgroundElement"
            style={[styles.section, { borderColor: theme.border }]}>
            <ThemedText type="small" themeColor="textSecondary">
              Essa tarefa nao existe mais ou ainda nao foi sincronizada.
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/tasks')}
              style={({ pressed }) => [
                styles.saveButton,
                { backgroundColor: theme.primary },
                pressed && styles.pressed,
              ]}>
              <ThemedText style={styles.saveButtonText}>Voltar para tarefas</ThemedText>
            </Pressable>
          </ThemedView>
        )}
      </ScreenShell>
    );
  }

  return (
    <TaskForm
      editingTask={editingTask}
      key={taskId ?? 'new-task'}
      taskId={taskId ?? null}
      taskState={taskState}
    />
  );
}

type TaskFormProps = {
  editingTask: Task | null;
  taskId: string | null;
  taskState: ReturnType<typeof useTasks>;
};

function TaskForm({ editingTask, taskId, taskState }: TaskFormProps) {
  const router = useRouter();
  const theme = useTheme();
  const { createTaskDraft, errorMessage, isSaving, updateTaskDraft } = taskState;
  const { isDesktop } = useResponsiveLayout();
  const isEditing = Boolean(taskId);

  const [categoryId, setCategoryId] = useState<string | null>(editingTask?.category ?? 'pessoal');
  const [dueDate, setDueDate] = useState<string | null>(editingTask?.dueDate ?? null);
  const [estimateInput, setEstimateInput] = useState(
    editingTask?.estimatedMinutes ? String(editingTask.estimatedMinutes) : ''
  );
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(
    editingTask?.estimatedMinutes ?? 30
  );
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const [notes, setNotes] = useState(editingTask?.notes ?? '');
  const [tagsInput, setTagsInput] = useState(editingTask?.tags.join(', ') ?? '');
  const [title, setTitle] = useState(editingTask?.title ?? '');

  const calendarDays = useMemo(() => getCalendarDays(monthCursor), [monthCursor]);
  const fieldSurfaceStyle = useMemo(
    () => ({
      backgroundColor: theme.background,
      borderColor: theme.border,
    }),
    [theme.background, theme.border]
  );
  const selectedCategory = defaultCategories.find((category) => category.id === categoryId) ?? null;
  const canSave = title.trim().length > 0 && !isSaving && (!isEditing || Boolean(editingTask));

  function resetForm() {
    setCategoryId('pessoal');
    setDueDate(null);
    setEstimateInput('');
    setEstimatedMinutes(30);
    setNotes('');
    setTagsInput('');
    setTitle('');
  }

  function shiftMonth(direction: -1 | 1) {
    setMonthCursor(
      (currentMonth) =>
        new Date(currentMonth.getFullYear(), currentMonth.getMonth() + direction, 1)
    );
  }

  function selectEstimate(minutes: number) {
    setEstimatedMinutes(minutes);
    setEstimateInput(String(minutes));
  }

  function updateEstimateInput(value: string) {
    const normalizedValue = value.replace(/[^0-9]/g, '');
    setEstimateInput(normalizedValue);
    setEstimatedMinutes(normalizedValue ? Number(normalizedValue) : null);
  }

  async function saveTask() {
    if (!canSave) {
      return;
    }

    const draft = {
      category: categoryId,
      dueDate,
      estimatedMinutes,
      notes: notes.trim() || null,
      rawInput: title.trim(),
      tags: normalizeTags(tagsInput),
      title: title.trim(),
    };
    const saved =
      isEditing && taskId
        ? await updateTaskDraft(taskId, draft)
        : await createTaskDraft(draft);

    if (saved) {
      resetForm();
      router.push('/tasks');
    }
  }

  const formSubtitle = selectedCategory
    ? `${selectedCategory.label} - ${formatDate(dueDate)} - ${formatEstimate(estimatedMinutes)}`
    : `${formatDate(dueDate)} - ${formatEstimate(estimatedMinutes)}`;

  return (
    <ScreenShell
      maxWidth={FormContentWidth}
      subtitle={formSubtitle}
      title={isEditing ? 'Editar tarefa' : 'Criar tarefa'}>
      <View style={[styles.formGrid, isDesktop && styles.formGridDesktop]}>
        <View style={styles.mainColumn}>
          <ThemedView
            type="backgroundElement"
            style={[styles.section, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Titulo</ThemedText>
            <TextInput
              onChangeText={setTitle}
              placeholder="Ex: revisar material da prova"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, fieldSurfaceStyle, { color: theme.text }]}
              value={title}
            />
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.section, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Notas</ThemedText>
            <TextInput
              multiline
              onChangeText={setNotes}
              placeholder="Detalhes opcionais"
              placeholderTextColor={theme.textSecondary}
              style={[styles.notesInput, fieldSurfaceStyle, { color: theme.text }]}
              value={notes}
            />
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.section, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Tags</ThemedText>
            <TextInput
              onChangeText={setTagsInput}
              placeholder="Ex: prova, leitura, casa"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, fieldSurfaceStyle, { color: theme.text }]}
              value={tagsInput}
            />
          </ThemedView>
        </View>

        <View style={[styles.sideColumn, isDesktop && styles.sideColumnDesktop]}>
          <ThemedView
            type="backgroundElement"
            style={[styles.section, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Categoria</ThemedText>
            <View style={styles.chipGrid}>
              {defaultCategories.map((category) => {
                const isSelected = category.id === categoryId;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={category.id}
                    onPress={() => setCategoryId(category.id)}
                    style={({ pressed }) => [
                      styles.categoryChip,
                      { borderColor: category.color },
                      isSelected && { backgroundColor: category.color },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={isSelected ? styles.selectedChipText : { color: category.color }}>
                      {category.label}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.section, { borderColor: theme.border }]}>
            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold">Prazo</ThemedText>
              <Pressable
                accessibilityRole="button"
                onPress={() => setDueDate(null)}
                style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                <ThemedText type="small">Limpar</ThemedText>
              </Pressable>
            </View>

            <Pressable
              accessibilityRole="button"
              onPress={() => setIsCalendarOpen((isOpen) => !isOpen)}
              style={({ pressed }) => [
                styles.dateButton,
                fieldSurfaceStyle,
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">{formatDate(dueDate)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Escolher no calendario
              </ThemedText>
            </Pressable>

            {isCalendarOpen && (
              <View style={styles.calendar}>
                <View style={styles.calendarHeader}>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => shiftMonth(-1)}
                    style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold">Ant</ThemedText>
                  </Pressable>
                  <ThemedText type="smallBold" style={styles.monthTitle}>
                    {getMonthTitle(monthCursor)}
                  </ThemedText>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => shiftMonth(1)}
                    style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}>
                    <ThemedText type="smallBold">Prox</ThemedText>
                  </Pressable>
                </View>

                <View style={styles.calendarGrid}>
                  {weekDays.map((weekDay, index) => (
                    <View key={`${weekDay}-${index}`} style={styles.calendarCellSlot}>
                      <ThemedText
                        type="smallBold"
                        themeColor="textSecondary"
                        style={styles.weekDay}>
                        {weekDay}
                      </ThemedText>
                    </View>
                  ))}

                  {calendarDays.map((date, index) => {
                    if (!date) {
                      return (
                        <View key={`blank-${index}`} style={styles.calendarCellSlot}>
                          <View style={styles.dayCellPlaceholder} />
                        </View>
                      );
                    }

                    const dateValue = toDateOnly(date);
                    const isSelected = dateValue === dueDate;

                    return (
                      <View key={dateValue} style={styles.calendarCellSlot}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setDueDate(dateValue);
                            setIsCalendarOpen(false);
                          }}
                          style={({ pressed }) => [
                            styles.dayCell,
                            isSelected && { backgroundColor: theme.text },
                            pressed && styles.pressed,
                          ]}>
                          <ThemedText
                            type="smallBold"
                            style={isSelected && { color: theme.background }}>
                            {date.getDate()}
                          </ThemedText>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </ThemedView>

          <ThemedView
            type="backgroundElement"
            style={[styles.section, { borderColor: theme.border }]}>
            <ThemedText type="smallBold">Tempo estimado</ThemedText>
            <View style={styles.chipGrid}>
              {quickEstimateOptions.map((minutes) => {
                const isSelected = estimatedMinutes === minutes;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={minutes}
                    onPress={() => selectEstimate(minutes)}
                    style={({ pressed }) => [
                      styles.estimateChip,
                      fieldSurfaceStyle,
                      isSelected && { backgroundColor: theme.text, borderColor: theme.text },
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={isSelected && { color: theme.background }}>
                      {formatEstimate(minutes)}
                    </ThemedText>
                  </Pressable>
                );
              })}
            </View>

            <TextInput
              keyboardType="number-pad"
              onChangeText={updateEstimateInput}
              placeholder="Minutos personalizados"
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, fieldSurfaceStyle, { color: theme.text }]}
              value={estimateInput}
            />
          </ThemedView>

          {errorMessage && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {errorMessage}
            </ThemedText>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={!canSave}
            onPress={saveTask}
            style={({ pressed }) => [
              styles.saveButton,
              { backgroundColor: theme.primary },
              pressed && styles.pressed,
              !canSave && styles.disabledButton,
            ]}>
            {isSaving ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <ThemedText style={styles.saveButtonText}>
                {isEditing ? 'Salvar alteracoes' : 'Salvar tarefa'}
              </ThemedText>
            )}
          </Pressable>
        </View>
      </View>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  calendar: {
    gap: Spacing.two,
  },
  calendarCellSlot: {
    alignItems: 'center',
    paddingHorizontal: Spacing.half,
    paddingVertical: Spacing.half,
    width: '14.2857%',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'space-between',
  },
  categoryChip: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: Spacing.two,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  clearButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: Spacing.two,
  },
  dateButton: {
    alignItems: 'flex-start',
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.half,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: Spacing.three,
  },
  dayCell: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    height: 34,
    justifyContent: 'center',
    maxWidth: 36,
    width: '100%',
  },
  dayCellPlaceholder: {
    height: 34,
    maxWidth: 36,
    width: '100%',
  },
  disabledButton: {
    opacity: 0.48,
  },
  estimateChip: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    minWidth: 64,
  },
  formGrid: {
    gap: Spacing.three,
  },
  formGridDesktop: {
    alignItems: 'flex-start',
    flexDirection: 'row',
  },
  input: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
  mainColumn: {
    flex: 1,
    gap: Spacing.three,
    minWidth: 0,
  },
  monthButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 34,
    minWidth: 46,
  },
  monthTitle: {
    flex: 1,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  notesInput: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 150,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  pressed: {
    opacity: 0.78,
  },
  saveButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 46,
  },
  saveButtonText: {
    color: '#ffffff',
    fontWeight: 700,
  },
  section: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.two,
    padding: Spacing.three,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  selectedChipText: {
    color: '#ffffff',
  },
  sideColumn: {
    gap: Spacing.three,
  },
  sideColumnDesktop: {
    width: 340,
  },
  weekDay: {
    textAlign: 'center',
  },
});
