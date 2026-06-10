import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getCategoryById } from '@/features/categories/default-categories';
import { useTheme } from '@/hooks/use-theme';

import type { Task } from './task.types';

type TaskCardProps = {
  adjustedScore?: number;
  onDelete: (taskId: string) => void;
  onToggleDone: (task: Task) => void;
  task: Task;
};

function formatEstimate(minutes: number | null) {
  if (!minutes) {
    return null;
  }

  if (minutes < 60) {
    return `${minutes}min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return remainingMinutes > 0 ? `${hours}h${remainingMinutes}` : `${hours}h`;
}

function formatDueDate(dateValue: string | null) {
  if (!dateValue) {
    return null;
  }

  const [year, month, day] = dateValue.split('-');
  return `${day}/${month}/${year}`;
}

export function TaskCard({ adjustedScore, onDelete, onToggleDone, task }: TaskCardProps) {
  const theme = useTheme();
  const category = getCategoryById(task.category);
  const estimate = formatEstimate(task.estimatedMinutes);
  const dueDate = formatDueDate(task.dueDate);
  const isDone = task.status === 'done';
  const displayedScore = adjustedScore ?? task.priorityScore;

  return (
    <ThemedView
      type="backgroundElement"
      style={[
        styles.card,
        { borderColor: theme.border, borderLeftColor: category?.color ?? '#64748b' },
      ]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          {category && (
            <ThemedText type="smallBold" style={[styles.categoryLabel, { color: category.color }]}>
              {category.label}
            </ThemedText>
          )}
          <ThemedText style={[styles.title, isDone && styles.doneTitle]}>{task.title}</ThemedText>
        </View>
        <ThemedText type="smallBold" style={[styles.score, getScoreStyle(displayedScore)]}>
          {displayedScore}
        </ThemedText>
      </View>

      <View style={styles.metaRow}>
        <ThemedText type="small" themeColor="textSecondary">
          {task.priorityLabel}
        </ThemedText>
        {dueDate && (
          <ThemedText type="small" themeColor="textSecondary">
            {dueDate}
          </ThemedText>
        )}
        {estimate && (
          <ThemedText type="small" themeColor="textSecondary">
            {estimate}
          </ThemedText>
        )}
      </View>

      {task.tags.length > 0 && (
        <View style={styles.tagRow}>
          {task.tags.map((tag) => (
            <ThemedView key={tag} type="backgroundSelected" style={styles.tag}>
              <ThemedText type="small">#{tag}</ThemedText>
            </ThemedView>
          ))}
        </View>
      )}

      <ThemedText type="small" themeColor="textSecondary">
        {task.priorityReasons.slice(0, 2).join(' + ')}
      </ThemedText>

      <View style={styles.actions}>
        <Pressable
          accessibilityRole="button"
          onPress={() => onToggleDone(task)}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: theme.primarySoft },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold">{isDone ? 'Reabrir' : 'Concluir'}</ThemedText>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => onDelete(task.id)}
          style={({ pressed }) => [
            styles.deleteButton,
            { backgroundColor: theme.dangerSoft },
            pressed && styles.pressed,
          ]}>
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            Excluir
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

function getScoreStyle(score: number) {
  if (score >= 80) {
    return styles.scoreUrgent;
  }

  if (score >= 50) {
    return styles.scoreHigh;
  }

  if (score >= 25) {
    return styles.scoreMedium;
  }

  return styles.scoreLow;
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  card: {
    borderWidth: 1,
    borderLeftWidth: 4,
    borderRadius: Spacing.two,
    gap: Spacing.two,
    padding: 14,
  },
  deleteButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    flex: 1,
    minHeight: 36,
    justifyContent: 'center',
  },
  doneTitle: {
    opacity: 0.55,
    textDecorationLine: 'line-through',
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'space-between',
  },
  categoryLabel: {
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  pressed: {
    opacity: 0.78,
  },
  score: {
    borderRadius: Spacing.two,
    color: '#ffffff',
    minWidth: 38,
    overflow: 'hidden',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    textAlign: 'center',
  },
  scoreHigh: {
    backgroundColor: '#dc2626',
  },
  scoreLow: {
    backgroundColor: '#475569',
  },
  scoreMedium: {
    backgroundColor: '#ca8a04',
  },
  scoreUrgent: {
    backgroundColor: '#991b1b',
  },
  tag: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.one,
  },
  title: {
    flex: 1,
    flexShrink: 1,
  },
  titleBlock: {
    flex: 1,
    gap: Spacing.half,
  },
});
