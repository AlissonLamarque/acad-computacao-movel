import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ScreenShell } from '@/components/screen-shell';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing, WideContentWidth } from '@/constants/theme';
import { useAuth } from '@/features/auth/use-auth';
import type { GoogleCalendarEvent } from '@/features/calendar/calendar.types';
import { useCalendarEvents } from '@/features/calendar/use-calendar-events';
import { getCategoryById } from '@/features/categories/default-categories';
import type { Task, TaskStatus } from '@/features/tasks/task.types';
import { useTasks } from '@/features/tasks/use-tasks';
import { useResponsiveLayout } from '@/hooks/use-responsive-layout';
import { useTheme } from '@/hooks/use-theme';

type AgendaBlock = {
  allDay: boolean;
  color: string;
  date: string;
  end: string | null;
  id: string;
  location: string | null;
  meta: string | null;
  source: 'foco' | 'google';
  start: string | null;
  status?: TaskStatus;
  title: string;
};

const timelineStartHour = 7;
const timelineEndHour = 22;
const timelineHours = Array.from(
  { length: timelineEndHour - timelineStartHour + 1 },
  (_, index) => timelineStartHour + index
);

const googleEventColors: Record<string, string> = {
  '1': '#7986cb',
  '2': '#33b679',
  '3': '#8e24aa',
  '4': '#e67c73',
  '5': '#f6bf26',
  '6': '#f4511e',
  '7': '#039be5',
  '8': '#616161',
  '9': '#3f51b5',
  '10': '#0b8043',
  '11': '#d50000',
};

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateOnly(dateValue: string) {
  const [yearValue, monthValue, dayValue] = dateValue.split('-').map(Number);

  if (!yearValue || !monthValue || !dayValue) {
    return null;
  }

  return new Date(yearValue, monthValue - 1, dayValue);
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);

  return nextDate;
}

function getWeekStart(date: Date) {
  const weekStart = new Date(date);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  return weekStart;
}

function getWeekEnd(weekStart: Date) {
  return addDays(weekStart, 7);
}

function getWeekDays(weekStart: Date) {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'short',
  })
    .format(date)
    .replace('.', '');
}

function formatDayName(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '');
}

function formatWeekRange(weekStart: Date, weekEnd: Date) {
  const startLabel = formatDateLabel(weekStart);
  const endLabel = formatDateLabel(addDays(weekEnd, -1));

  return `${startLabel} - ${endLabel}`;
}

function formatTime(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatEstimate(minutes: number | null) {
  if (!minutes) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

function formatStatus(status: TaskStatus | undefined) {
  if (status === 'done') {
    return 'Concluida';
  }

  if (status === 'planned') {
    return 'Planejada';
  }

  return 'Inbox';
}

function getGoogleEventColor(event: GoogleCalendarEvent) {
  if (event.colorId && googleEventColors[event.colorId]) {
    return googleEventColors[event.colorId];
  }

  return '#2563eb';
}

function createGoogleBlocks(events: GoogleCalendarEvent[]): AgendaBlock[] {
  return events.map((event) => ({
    allDay: event.allDay,
    color: getGoogleEventColor(event),
    date: toDateOnly(new Date(event.start)),
    end: event.end,
    id: `google-${event.id}`,
    location: event.location,
    meta: event.description,
    source: 'google',
    start: event.start,
    title: event.title,
  }));
}

function createTaskBlocks(tasks: Task[]): AgendaBlock[] {
  return tasks
    .filter((task) => Boolean(task.dueDate))
    .map((task) => {
      const category = getCategoryById(task.category);
      const categoryLabel = category?.label ?? task.category ?? 'Sem categoria';
      const estimateLabel = formatEstimate(task.estimatedMinutes);
      const meta = [categoryLabel, estimateLabel, task.priorityLabel, formatStatus(task.status)]
        .filter(Boolean)
        .join(' - ');

      return {
        allDay: true,
        color: category?.color ?? '#475569',
        date: task.dueDate ?? '',
        end: null,
        id: `foco-${task.id}`,
        location: null,
        meta,
        source: 'foco',
        start: null,
        status: task.status,
        title: task.title,
      };
    });
}

function getBlockInterval(block: AgendaBlock) {
  const blockStart = block.start ? new Date(block.start) : parseDateOnly(block.date);

  if (!blockStart) {
    return null;
  }

  const fallbackEnd = block.allDay ? addDays(blockStart, 1) : new Date(blockStart.getTime() + 3600000);
  let blockEnd = block.end ? new Date(block.end) : fallbackEnd;

  if (Number.isNaN(blockEnd.getTime()) || blockEnd <= blockStart) {
    blockEnd = fallbackEnd;
  }

  return {
    end: blockEnd,
    start: blockStart,
  };
}

function isBlockInRange(block: AgendaBlock, rangeStart: Date, rangeEnd: Date) {
  const interval = getBlockInterval(block);

  if (!interval) {
    return false;
  }

  return interval.start < rangeEnd && interval.end > rangeStart;
}

function isBlockOnDate(block: AgendaBlock, dateValue: string) {
  const dayStart = parseDateOnly(dateValue);

  if (!dayStart) {
    return false;
  }

  const dayEnd = addDays(dayStart, 1);

  return isBlockInRange(block, dayStart, dayEnd);
}

function getDisplayHour(block: AgendaBlock, dateValue: string) {
  const dayStart = parseDateOnly(dateValue);
  const interval = getBlockInterval(block);

  if (!dayStart || !interval) {
    return timelineStartHour;
  }

  const hour = interval.start < dayStart ? timelineStartHour : interval.start.getHours();

  return Math.min(timelineEndHour, Math.max(timelineStartHour, hour));
}

function getBlockSortTime(block: AgendaBlock) {
  if (block.allDay || !block.start) {
    return -1;
  }

  const time = new Date(block.start).getTime();

  return Number.isNaN(time) ? -1 : time;
}

function sortBlocks(blocks: AgendaBlock[]) {
  return [...blocks].sort((firstBlock, secondBlock) => {
    const timeComparison = getBlockSortTime(firstBlock) - getBlockSortTime(secondBlock);

    if (timeComparison !== 0) {
      return timeComparison;
    }

    return firstBlock.title.localeCompare(secondBlock.title, 'pt-BR');
  });
}

function formatBlockTime(block: AgendaBlock) {
  if (block.source === 'foco' && !block.start) {
    return 'Sem horario';
  }

  if (block.allDay || !block.start) {
    return 'Dia inteiro';
  }

  const start = new Date(block.start);
  const end = block.end ? new Date(block.end) : new Date(start.getTime() + 3600000);

  return `${formatTime(start)} - ${formatTime(end)}`;
}

export default function CalendarScreen() {
  const { googleAccessToken, user } = useAuth();
  const { isDesktop } = useResponsiveLayout();
  const theme = useTheme();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const todayDate = useMemo(() => toDateOnly(new Date()), []);
  const weekEnd = useMemo(() => getWeekEnd(weekStart), [weekStart]);
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart]);
  const calendar = useCalendarEvents(googleAccessToken, weekEnd, weekStart);
  const { errorMessage: tasksErrorMessage, isLoading: isTasksLoading, tasks } = useTasks(user?.uid);
  const googleBlocks = useMemo(() => createGoogleBlocks(calendar.events), [calendar.events]);
  const taskBlocks = useMemo(() => createTaskBlocks(tasks), [tasks]);
  const weeklyBlocks = useMemo(
    () => sortBlocks([...googleBlocks, ...taskBlocks].filter((block) => isBlockInRange(block, weekStart, weekEnd))),
    [googleBlocks, taskBlocks, weekEnd, weekStart]
  );
  const googleWeeklyCount = weeklyBlocks.filter((block) => block.source === 'google').length;
  const focoWeeklyCount = weeklyBlocks.filter((block) => block.source === 'foco').length;
  const isLoading = calendar.isLoading || isTasksLoading;
  const errorMessage = calendar.errorMessage ?? tasksErrorMessage;

  function changeWeek(direction: -1 | 1) {
    setWeekStart((currentWeekStart) => addDays(currentWeekStart, direction * 7));
  }

  function selectCurrentWeek() {
    setWeekStart(getWeekStart(new Date()));
  }

  const calendarBoard = (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.weekBoard,
        !isDesktop && styles.weekBoardMobile,
        { borderColor: theme.border },
      ]}>
      <View style={[styles.boardHeader, { borderColor: theme.border }]}>
        <View style={styles.timeGutter} />
        {weekDays.map((day) => {
          const dateValue = toDateOnly(day);
          const isToday = dateValue === todayDate;

          return (
            <View
              key={dateValue}
              style={[styles.boardDayHeader, isToday && { backgroundColor: theme.backgroundSelected }]}>
              <ThemedText type="smallBold">{formatDayName(day)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatDateLabel(day)}
              </ThemedText>
            </View>
          );
        })}
      </View>

      <View style={[styles.allDayRow, { borderColor: theme.border }]}>
        <View style={styles.timeGutter}>
          <ThemedText type="small" themeColor="textSecondary">
            Dia
          </ThemedText>
        </View>
        {weekDays.map((day) => {
          const dateValue = toDateOnly(day);
          const dayBlocks = weeklyBlocks.filter(
            (block) => isBlockOnDate(block, dateValue) && (block.allDay || !block.start)
          );

          return (
            <View key={dateValue} style={[styles.boardSlot, { borderColor: theme.border }]}>
              {dayBlocks.length === 0 ? (
                <View style={styles.emptyBoardSlot} />
              ) : (
                dayBlocks.map((block) => <AgendaBlockCard block={block} compact key={block.id} />)
              )}
            </View>
          );
        })}
      </View>

      {timelineHours.map((hour) => (
        <View key={hour} style={[styles.hourRow, { borderColor: theme.border }]}>
          <View style={styles.timeGutter}>
            <ThemedText type="small" themeColor="textSecondary">
              {String(hour).padStart(2, '0')}:00
            </ThemedText>
          </View>
          {weekDays.map((day) => {
            const dateValue = toDateOnly(day);
            const dayBlocks = weeklyBlocks.filter(
              (block) =>
                isBlockOnDate(block, dateValue) &&
                !block.allDay &&
                Boolean(block.start) &&
                getDisplayHour(block, dateValue) === hour
            );

            return (
              <View key={`${dateValue}-${hour}`} style={[styles.boardSlot, { borderColor: theme.border }]}>
                {dayBlocks.length === 0 ? (
                  <View style={styles.emptyBoardSlot} />
                ) : (
                  dayBlocks.map((block) => <AgendaBlockCard block={block} compact key={block.id} />)
                )}
              </View>
            );
          })}
        </View>
      ))}
    </ThemedView>
  );

  return (
    <ScreenShell
      actions={
        <Pressable
          accessibilityRole="button"
          onPress={() => void calendar.refresh()}
          style={({ pressed }) => [
            styles.refreshButton,
            { borderColor: theme.border },
            pressed && styles.pressed,
          ]}>
          <SymbolView
            fallback={<ThemedText type="smallBold">R</ThemedText>}
            name={{ android: 'refresh', ios: 'arrow.clockwise', web: 'refresh' }}
            size={17}
            tintColor={theme.text}
          />
          <ThemedText type="smallBold">{calendar.isLoading ? 'Atualizando' : 'Atualizar'}</ThemedText>
        </Pressable>
      }
      maxWidth={WideContentWidth}
      subtitle={`${googleWeeklyCount} eventos Google - ${focoWeeklyCount} tarefas do Foco na semana`}
      title="Agenda">
      <View style={[styles.weekToolbar, !isDesktop && styles.weekToolbarMobile]}>
        <View style={styles.weekNavigation}>
          <IconButton label="Semana anterior" onPress={() => changeWeek(-1)} symbol="chevron.left" />
          <View style={styles.weekTitle}>
            <ThemedText type="smallBold">{formatWeekRange(weekStart, weekEnd)}</ThemedText>
          </View>
          <IconButton label="Proxima semana" onPress={() => changeWeek(1)} symbol="chevron.right" />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={selectCurrentWeek}
          style={({ pressed }) => [
            styles.todayButton,
            { backgroundColor: theme.text },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.background }}>
            Hoje
          </ThemedText>
        </Pressable>
      </View>

      {errorMessage && (
        <ThemedView type="backgroundElement" style={[styles.errorBox, { borderColor: theme.danger }]}>
          <ThemedText type="small" style={{ color: theme.danger }}>
            {errorMessage}
          </ThemedText>
        </ThemedView>
      )}

      {isLoading && (
        <ThemedView type="backgroundElement" style={[styles.loadingBox, { borderColor: theme.border }]}>
          <ActivityIndicator />
          <ThemedText type="small" themeColor="textSecondary">
            Carregando agenda...
          </ThemedText>
        </ThemedView>
      )}

      {isDesktop ? (
        calendarBoard
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mobileBoardScroll}
          contentContainerStyle={styles.mobileBoardScrollContent}>
          {calendarBoard}
        </ScrollView>
      )}
    </ScreenShell>
  );
}

function IconButton({
  label,
  onPress,
  symbol,
}: {
  label: string;
  onPress: () => void;
  symbol: 'chevron.left' | 'chevron.right';
}) {
  const theme = useTheme();
  const fallback = symbol === 'chevron.left' ? '<' : '>';

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.iconButton,
        { borderColor: theme.border, backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <SymbolView
        fallback={<ThemedText type="smallBold">{fallback}</ThemedText>}
        name={{
          android: symbol === 'chevron.left' ? 'chevron_left' : 'chevron_right',
          ios: symbol,
          web: symbol === 'chevron.left' ? 'chevron_left' : 'chevron_right',
        }}
        size={18}
        tintColor={theme.text}
      />
    </Pressable>
  );
}

function AgendaBlockCard({ block, compact = false }: { block: AgendaBlock; compact?: boolean }) {
  const theme = useTheme();
  const sourceLabel = block.source === 'foco' ? 'Foco' : 'Google';
  const sourceBackground = block.source === 'foco' ? theme.primarySoft : theme.backgroundSelected;

  return (
    <View
      style={[
        styles.agendaBlock,
        compact && styles.agendaBlockCompact,
        block.status === 'done' && styles.doneBlock,
        {
          backgroundColor: theme.background,
          borderColor: theme.border,
          borderLeftColor: block.color,
        },
      ]}>
      <View style={styles.blockHeader}>
        <View style={[styles.sourcePill, { backgroundColor: sourceBackground }]}>
          <ThemedText
            type="smallBold"
            style={[styles.sourceText, { color: block.source === 'foco' ? theme.primary : block.color }]}>
            {sourceLabel}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary" style={styles.blockTime}>
          {formatBlockTime(block)}
        </ThemedText>
      </View>

      <ThemedText type="smallBold" numberOfLines={compact ? 2 : undefined} style={styles.blockTitle}>
        {block.title}
      </ThemedText>

      {!compact && (block.meta || block.location) && (
        <ThemedText type="small" themeColor="textSecondary">
          {[block.location, block.meta].filter(Boolean).join(' - ')}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  agendaBlock: {
    borderLeftWidth: 4,
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.half,
    padding: Spacing.two,
  },
  agendaBlockCompact: {
    minHeight: 42,
    padding: Spacing.one,
  },
  allDayRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 58,
  },
  blockHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
    justifyContent: 'space-between',
  },
  blockTime: {
    flexShrink: 0,
  },
  blockTitle: {
    flexShrink: 1,
  },
  boardDayHeader: {
    alignItems: 'center',
    flex: 1,
    gap: Spacing.half,
    justifyContent: 'center',
    minHeight: 50,
    padding: Spacing.one,
  },
  boardHeader: {
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  boardSlot: {
    borderLeftWidth: 1,
    flex: 1,
    gap: Spacing.one,
    minWidth: 0,
    padding: Spacing.one,
  },
  doneBlock: {
    opacity: 0.62,
  },
  emptyBoardSlot: {
    minHeight: 18,
  },
  errorBox: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    padding: Spacing.two,
  },
  hourRow: {
    borderBottomWidth: 1,
    flexDirection: 'row',
    minHeight: 54,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  loadingBox: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
    minHeight: 64,
    padding: Spacing.three,
  },
  pressed: {
    opacity: 0.78,
  },
  mobileBoardScroll: {
    width: '100%',
  },
  mobileBoardScrollContent: {
    paddingBottom: Spacing.one,
  },
  refreshButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    flexDirection: 'row',
    gap: Spacing.one,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  sourcePill: {
    alignItems: 'center',
    borderRadius: Spacing.one,
    justifyContent: 'center',
    minHeight: 20,
    paddingHorizontal: Spacing.one,
  },
  sourceText: {
    fontSize: 11,
    lineHeight: 14,
  },
  timeGutter: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingHorizontal: Spacing.one,
    paddingTop: Spacing.one,
    width: 52,
  },
  todayButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: Spacing.three,
  },
  weekBoard: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    minWidth: 0,
    overflow: 'hidden',
    width: '100%',
  },
  weekBoardMobile: {
    width: 920,
  },
  weekNavigation: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
  },
  weekTitle: {
    gap: Spacing.half,
    minWidth: 180,
  },
  weekToolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  weekToolbarMobile: {
    alignItems: 'stretch',
    flexDirection: 'column',
  },
});
