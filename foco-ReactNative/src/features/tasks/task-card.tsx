import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { getCategoryById } from '@/features/categories/default-categories';
import { useTheme } from '@/hooks/use-theme';

import type { Task } from './task.types';

type TaskCardProps = {
  adjustedScore?: number;
  onDelete: (taskId: string) => void;
  onEdit?: (task: Task) => void;
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

function formatNullable(value: string | null | undefined) {
  return value?.trim() || 'Nao informado';
}

function formatStatus(status: Task['status']) {
  if (status === 'done') {
    return 'Concluida';
  }

  if (status === 'planned') {
    return 'Planejada';
  }

  return 'Inbox';
}

export function TaskCard({ adjustedScore, onDelete, onEdit, onToggleDone, task }: TaskCardProps) {
  const [isDetailsVisible, setIsDetailsVisible] = useState(false);
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
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Ver detalhes da tarefa"
            accessibilityRole="button"
            onPress={() => setIsDetailsVisible(true)}
            style={({ pressed }) => [
              styles.iconButton,
              { borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <SymbolView
              fallback={<ThemedText style={styles.iconFallback}>o</ThemedText>}
              name={{ android: 'visibility', ios: 'eye', web: 'visibility' }}
              size={18}
              tintColor={theme.text}
            />
          </Pressable>
          {onEdit && (
            <Pressable
              accessibilityLabel="Editar tarefa"
              accessibilityRole="button"
              onPress={() => onEdit(task)}
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <SymbolView
                fallback={<ThemedText style={styles.iconFallback}>e</ThemedText>}
                name={{ android: 'edit', ios: 'pencil', web: 'edit' }}
                size={18}
                tintColor={theme.text}
              />
            </Pressable>
          )}
          <ThemedText type="smallBold" style={[styles.score, getScoreStyle(displayedScore)]}>
            {displayedScore}
          </ThemedText>
        </View>
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

      <Modal
        animationType="fade"
        onRequestClose={() => setIsDetailsVisible(false)}
        transparent
        visible={isDetailsVisible}>
        <View style={styles.modalOverlay}>
          <ThemedView
            type="backgroundElement"
            style={[styles.modalContent, { borderColor: theme.border }]}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleBlock}>
                <ThemedText type="smallBold" themeColor="textSecondary">
                  Detalhes da tarefa
                </ThemedText>
                <ThemedText style={styles.modalTitle}>{task.title}</ThemedText>
              </View>
              <Pressable
                accessibilityLabel="Fechar detalhes"
                accessibilityRole="button"
                onPress={() => setIsDetailsVisible(false)}
                style={({ pressed }) => [
                  styles.iconButton,
                  { borderColor: theme.border },
                  pressed && styles.pressed,
                ]}>
                <SymbolView
                  fallback={<ThemedText style={styles.iconFallback}>x</ThemedText>}
                  name={{ android: 'close', ios: 'xmark', web: 'close' }}
                  size={18}
                  tintColor={theme.text}
                />
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.detailsList}>
              <View style={styles.modalHighlights}>
                <View
                  style={[
                    styles.categoryPill,
                    {
                      backgroundColor: category?.color ?? '#64748b',
                    },
                  ]}>
                  <ThemedText type="smallBold" style={styles.categoryPillText}>
                    {category?.label ?? task.category ?? 'Sem categoria'}
                  </ThemedText>
                </View>
                <View style={[styles.priorityPill, getScoreStyle(displayedScore)]}>
                  <ThemedText type="smallBold" style={styles.priorityPillText}>
                    {task.priorityLabel} - {displayedScore}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.detailGrid}>
                <DetailTile label="Status" value={formatStatus(task.status)} />
                <DetailTile label="Prazo" value={dueDate ?? 'Nao informado'} />
                <DetailTile label="Tempo" value={estimate ?? 'Nao informado'} />
                <DetailTile
                  label="Tags"
                  value={
                    task.tags.length > 0 ? task.tags.map((tag) => `#${tag}`).join(', ') : 'Nenhuma'
                  }
                />
              </View>

              <ThemedView type="backgroundSelected" style={styles.notesBox}>
                <ThemedText type="smallBold">Notas</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.notesText}>
                  {formatNullable(task.notes)}
                </ThemedText>
              </ThemedView>
            </ScrollView>
          </ThemedView>
        </View>
      </Modal>
    </ThemedView>
  );
}

function DetailTile({ label, value }: { label: string; value: string }) {
  return (
    <ThemedView type="backgroundSelected" style={styles.detailTile}>
      <ThemedText type="smallBold" themeColor="textSecondary">
        {label}
      </ThemedText>
      <ThemedText type="small" style={styles.detailValue}>
        {value}
      </ThemedText>
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
  detailsList: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
  },
  detailGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  detailTile: {
    borderRadius: Spacing.two,
    flexBasis: 168,
    flexGrow: 1,
    gap: Spacing.half,
    minHeight: 70,
    padding: Spacing.three,
  },
  detailValue: {
    flexShrink: 1,
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
  headerActions: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: Spacing.one,
  },
  iconButton: {
    alignItems: 'center',
    borderRadius: Spacing.two,
    borderWidth: 1,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  iconFallback: {
    fontSize: 16,
    fontWeight: 700,
    lineHeight: 18,
    textAlign: 'center',
  },
  categoryLabel: {
    textTransform: 'uppercase',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  modalContent: {
    borderRadius: Spacing.two,
    borderWidth: 1,
    gap: Spacing.four,
    maxHeight: '82%',
    maxWidth: 560,
    padding: Spacing.four,
    width: '100%',
  },
  modalHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: Spacing.three,
    justifyContent: 'space-between',
  },
  modalOverlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(17, 24, 39, 0.42)',
    flex: 1,
    justifyContent: 'center',
    padding: Spacing.three,
  },
  modalTitle: {
    flexShrink: 1,
  },
  modalTitleBlock: {
    flex: 1,
    gap: Spacing.half,
  },
  modalHighlights: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  categoryPill: {
    borderRadius: Spacing.two,
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  categoryPillText: {
    color: '#ffffff',
  },
  notesBox: {
    borderRadius: Spacing.two,
    gap: Spacing.one,
    padding: Spacing.three,
  },
  notesText: {
    flexShrink: 1,
  },
  pressed: {
    opacity: 0.78,
  },
  priorityPill: {
    borderRadius: Spacing.two,
    justifyContent: 'center',
    minHeight: 34,
    paddingHorizontal: Spacing.three,
  },
  priorityPillText: {
    color: '#ffffff',
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
