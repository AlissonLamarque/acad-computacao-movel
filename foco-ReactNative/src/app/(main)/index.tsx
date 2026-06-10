import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, TextInput, View } from 'react-native';

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

const categoryPattern = /#[A-Za-zÀ-ÿ0-9_-]+/g;
const quickEstimateOptions = [15, 30, 45, 60, 90, 120];
const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateOnly(dateValue: string | null) {
  if (!dateValue) {
    return null;
  }

  const [year, month, day] = dateValue.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
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

function formatTime(dateValue: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(dateValue));
}

function formatBusyBlock(block: { end: string; start: string }) {
  return `${formatTime(block.start)} - ${formatTime(block.end)}`;
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

function normalizeCategory(category: string) {
  return category
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function extractCategory(input: string) {
  const categoryMatch = input.match(categoryPattern)?.[0];

  if (!categoryMatch) {
    return null;
  }

  return normalizeCategory(categoryMatch.slice(1));
}

function cleanupBraindumpTitle(input: string) {
  return input.replace(categoryPattern, '').replace(/\s+/g, ' ').trim();
}

export default function TodayScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState('');
  const [dueDate, setDueDate] = useState<string | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number | null>(30);
  const [estimateInput, setEstimateInput] = useState('');
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [monthCursor, setMonthCursor] = useState(() => new Date());
  const { googleAccessToken, user } = useAuth();
  const {
    createTaskDraft,
    deleteTask,
    errorMessage,
    filteredTasks,
    isLoading,
    isSaving,
    setTaskStatus,
  } = useTasks(user?.uid);
  const selectedAgendaDate = useMemo(() => parseDateOnly(dueDate), [dueDate]);
  const calendar = useCalendarFreeBusy(googleAccessToken, selectedAgendaDate);
  const { isDesktop } = useResponsiveLayout();
  const theme = useTheme();
  const calendarDays = useMemo(() => getCalendarDays(monthCursor), [monthCursor]);

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
    const rawInput = draft.trim();
    const title = cleanupBraindumpTitle(rawInput);

    if (!rawInput || !title) {
      return;
    }

    const saved = await createTaskDraft({
      category: extractCategory(rawInput),
      dueDate,
      estimatedMinutes,
      notes: null,
      rawInput,
      tags: [],
      title,
    });

    if (!saved) {
      return;
    }

    setDraft('');
    setDueDate(null);
    setEstimatedMinutes(30);
    setEstimateInput('');
  }

  const subtitle = calendar.summary
    ? `Agenda carregada: maior janela livre ${calendar.summary.largestFreeWindowMinutes}min`
    : 'Prioridade por prazo, categoria e tempo estimado.';

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
              placeholder="Ex: revisar material da prova #faculdade"
              placeholderTextColor={theme.textSecondary}
              style={[
                styles.input,
                { borderColor: theme.border, color: theme.text },
                isDesktop && styles.inputDesktop,
              ]}
              value={draft}
            />

            <View style={styles.fieldGroup}>
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">Prazo</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatDate(dueDate)}
                </ThemedText>
              </View>
              <View style={styles.chipGrid}>
                {[
                  { label: 'Hoje', value: toDateOnly(new Date()) },
                  { label: 'Amanha', value: toDateOnly(addDays(new Date(), 1)) },
                  { label: 'Sem prazo', value: null },
                ].map((option) => {
                  const isSelected = option.value === dueDate;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={option.label}
                      onPress={() => {
                        setDueDate(option.value);
                        setIsCalendarOpen(false);
                      }}
                      style={({ pressed }) => [
                        styles.optionChip,
                        { borderColor: theme.border },
                        isSelected && { backgroundColor: theme.text, borderColor: theme.text },
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={isSelected && { color: theme.background }}>
                        {option.label}
                      </ThemedText>
                    </Pressable>
                  );
                })}
                <Pressable
                  accessibilityRole="button"
                  onPress={() => setIsCalendarOpen((isOpen) => !isOpen)}
                  style={({ pressed }) => [
                    styles.optionChip,
                    { borderColor: theme.border },
                    isCalendarOpen && {
                      backgroundColor: theme.text,
                      borderColor: theme.text,
                    },
                    pressed && styles.pressed,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={isCalendarOpen && { color: theme.background }}>
                    Calendario
                  </ThemedText>
                </Pressable>
              </View>

              {isCalendarOpen && (
                <View style={styles.calendarPicker}>
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
            </View>

            <View style={styles.fieldGroup}>
              <View style={styles.sectionHeader}>
                <ThemedText type="smallBold">Tempo estimado</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {formatEstimate(estimatedMinutes)}
                </ThemedText>
              </View>
              <View style={styles.chipGrid}>
                {quickEstimateOptions.map((minutes) => {
                  const isSelected = estimatedMinutes === minutes;

                  return (
                    <Pressable
                      accessibilityRole="button"
                      key={minutes}
                      onPress={() => selectEstimate(minutes)}
                      style={({ pressed }) => [
                        styles.optionChip,
                        { borderColor: theme.border },
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
                style={[styles.compactInput, { borderColor: theme.border, color: theme.text }]}
                value={estimateInput}
              />
            </View>

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
                {dueDate ? formatDate(dueDate) : 'Escolha um prazo'}
              </ThemedText>
            </View>

            {!dueDate ? (
              <ThemedText type="small" themeColor="textSecondary">
                Selecione um prazo para ver os horarios ocupados.
              </ThemedText>
            ) : calendar.isLoading ? (
              <View style={styles.agendaLoading}>
                <ActivityIndicator />
                <ThemedText type="small" themeColor="textSecondary">
                  Carregando horarios ocupados...
                </ThemedText>
              </View>
            ) : calendar.errorMessage ? (
              <ThemedText type="small" style={{ color: theme.danger }}>
                {calendar.errorMessage}
              </ThemedText>
            ) : calendar.summary && calendar.summary.busyBlocks.length > 0 ? (
              <View style={styles.busyList}>
                {calendar.summary.busyBlocks.map((block) => (
                  <ThemedView
                    key={`${block.start}-${block.end}`}
                    type="backgroundSelected"
                    style={[styles.busyBlock, { borderColor: theme.border }]}>
                    <ThemedText type="smallBold">{formatBusyBlock(block)}</ThemedText>
                  </ThemedView>
                ))}
              </View>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Nenhum horario ocupado nesse dia.
              </ThemedText>
            )}
          </ThemedView>
        </View>

        <View style={styles.taskColumn}>
          <View style={styles.listHeader}>
            <ThemedText type="smallBold">Fila priorizada</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {displayTasks.length} ativas
            </ThemedText>
          </View>

          {errorMessage && (
            <ThemedText type="small" style={{ color: theme.danger }}>
              {errorMessage}
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
  agendaLoading: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  busyBlock: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  busyList: {
    gap: Spacing.one,
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
  calendarPicker: {
    gap: Spacing.two,
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
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  compactInput: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    fontSize: 15,
    lineHeight: 22,
    minHeight: 42,
    paddingHorizontal: Spacing.three,
  },
  fieldGroup: {
    gap: Spacing.two,
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
  optionChip: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 36,
    paddingHorizontal: Spacing.two,
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
  weekDay: {
    textAlign: 'center',
  },
});
