import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  type FirestoreError,
} from 'firebase/firestore';

import { calculateTaskPriority } from '@/features/prioritization/calculate-priority';
import { firebaseDb } from '@/services/firebase/firestore';

import { parseBraindump } from './parse-braindump';
import type { Task, TaskDraft, TaskStatus } from './task.types';

type TaskDocument = Omit<Task, 'id'>;

function getTasksCollection(userId: string) {
  if (!firebaseDb) {
    throw new Error('Firestore is not configured.');
  }

  return collection(firebaseDb, 'users', userId, 'tasks');
}

function getTaskDocument(userId: string, taskId: string) {
  if (!firebaseDb) {
    throw new Error('Firestore is not configured.');
  }

  return doc(firebaseDb, 'users', userId, 'tasks', taskId);
}

function toTask(id: string, data: Partial<TaskDocument>): Task {
  return {
    category: data.category ?? null,
    completedAt: data.completedAt ?? null,
    createdAt: data.createdAt ?? new Date().toISOString(),
    dueDate: data.dueDate ?? null,
    estimatedMinutes: data.estimatedMinutes ?? null,
    id,
    notes: data.notes ?? null,
    priorityLabel: data.priorityLabel ?? 'Baixa',
    priorityReasons: data.priorityReasons ?? [],
    priorityScore: data.priorityScore ?? 0,
    rawInput: data.rawInput ?? data.title ?? '',
    source: data.source ?? 'manual',
    status: data.status ?? 'inbox',
    tags: data.tags ?? [],
    title: data.title ?? 'Tarefa sem titulo',
    updatedAt: data.updatedAt ?? new Date().toISOString(),
    userId: data.userId ?? '',
  };
}

async function createTaskFromDraft(userId: string, draft: TaskDraft, source: TaskDocument['source']) {
  const now = new Date().toISOString();
  const priority = calculateTaskPriority({
    category: draft.category,
    createdAt: now,
    dueDate: draft.dueDate,
    estimatedMinutes: draft.estimatedMinutes,
    tags: draft.tags,
  });

  const task: TaskDocument = {
    ...draft,
    completedAt: null,
    createdAt: now,
    priorityLabel: priority.priorityLabel,
    priorityReasons: priority.priorityReasons,
    priorityScore: priority.priorityScore,
    source,
    status: 'inbox',
    updatedAt: now,
    userId,
  };

  await addDoc(getTasksCollection(userId), task);
}

export async function createTaskFromBraindump(userId: string, input: string) {
  await createTaskFromDraft(userId, parseBraindump(input), 'braindump');
}

export async function createManualTask(userId: string, draft: TaskDraft) {
  await createTaskFromDraft(userId, draft, 'manual');
}

export async function updateUserTaskDraft(
  userId: string,
  taskId: string,
  draft: TaskDraft,
  currentTask?: Task
) {
  const now = new Date().toISOString();
  const priority = calculateTaskPriority({
    category: draft.category,
    createdAt: currentTask?.createdAt,
    dueDate: draft.dueDate,
    estimatedMinutes: draft.estimatedMinutes,
    status: currentTask?.status,
    tags: draft.tags,
  });

  await updateDoc(getTaskDocument(userId, taskId), {
    ...draft,
    priorityLabel: priority.priorityLabel,
    priorityReasons: priority.priorityReasons,
    priorityScore: priority.priorityScore,
    updatedAt: now,
  });
}

export function watchUserTasks(
  userId: string,
  onTasks: (tasks: Task[]) => void,
  onError: (error: FirestoreError) => void
) {
  const tasksQuery = query(getTasksCollection(userId), orderBy('createdAt', 'desc'));

  return onSnapshot(
    tasksQuery,
    (snapshot) => {
      const tasks = snapshot.docs
        .map((taskDocument) => toTask(taskDocument.id, taskDocument.data() as TaskDocument))
        .sort((firstTask, secondTask) => {
          if (firstTask.status === 'done' && secondTask.status !== 'done') {
            return 1;
          }

          if (firstTask.status !== 'done' && secondTask.status === 'done') {
            return -1;
          }

          return secondTask.priorityScore - firstTask.priorityScore;
        });

      onTasks(tasks);
    },
    onError
  );
}

export async function updateTaskStatus(userId: string, taskId: string, status: TaskStatus) {
  await updateDoc(getTaskDocument(userId, taskId), {
    completedAt: status === 'done' ? new Date().toISOString() : null,
    status,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteUserTask(userId: string, taskId: string) {
  await deleteDoc(getTaskDocument(userId, taskId));
}
