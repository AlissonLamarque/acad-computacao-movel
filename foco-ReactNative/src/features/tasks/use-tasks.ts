import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  createManualTask,
  createTaskFromBraindump,
  deleteUserTask,
  updateUserTaskDraft,
  updateTaskStatus,
  watchUserTasks,
} from './tasks-service';
import type { Task, TaskDraft, TaskStatus } from './task.types';

export type TaskFilter = 'all' | 'today' | 'inbox' | 'done';

function isToday(dateValue: string | null) {
  if (!dateValue) {
    return false;
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;

  return dateValue === today;
}

function applyFilter(tasks: Task[], filter: TaskFilter) {
  if (filter === 'today') {
    return tasks.filter((task) => task.status !== 'done' && isToday(task.dueDate));
  }

  if (filter === 'inbox') {
    return tasks.filter((task) => task.status === 'inbox');
  }

  if (filter === 'done') {
    return tasks.filter((task) => task.status === 'done');
  }

  return tasks.filter((task) => task.status !== 'done');
}

export function useTasks(userId?: string | null, filter: TaskFilter = 'all') {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(userId));
  const [isSaving, setIsSaving] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    if (!userId) {
      const resetTimer = setTimeout(() => {
        setIsLoading(false);
        setTasks([]);
      }, 0);

      return () => {
        clearTimeout(resetTimer);
      };
    }

    const loadingTimer = setTimeout(() => {
      setIsLoading(true);
    }, 0);

    const unsubscribe = watchUserTasks(
      userId,
      (nextTasks) => {
        setTasks(nextTasks);
        setErrorMessage(null);
        setIsLoading(false);
      },
      () => {
        setErrorMessage('Nao foi possivel carregar as tarefas.');
        setIsLoading(false);
      }
    );

    return () => {
      clearTimeout(loadingTimer);
      unsubscribe();
    };
  }, [userId]);

  const createTask = useCallback(
    async (input: string) => {
      if (!userId) {
        return;
      }

      setIsSaving(true);

      try {
        await createTaskFromBraindump(userId, input);
        setErrorMessage(null);
      } catch {
        setErrorMessage('Nao foi possivel registrar a tarefa.');
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  const createTaskDraft = useCallback(
    async (draft: TaskDraft) => {
      if (!userId) {
        return false;
      }

      setIsSaving(true);

      try {
        await createManualTask(userId, draft);
        setErrorMessage(null);
        return true;
      } catch {
        setErrorMessage('Nao foi possivel registrar a tarefa.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [userId]
  );

  const updateTaskDraft = useCallback(
    async (taskId: string, draft: TaskDraft) => {
      if (!userId) {
        return false;
      }

      setIsSaving(true);

      try {
        await updateUserTaskDraft(
          userId,
          taskId,
          draft,
          tasks.find((task) => task.id === taskId)
        );
        setErrorMessage(null);
        return true;
      } catch {
        setErrorMessage('Nao foi possivel atualizar a tarefa.');
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [tasks, userId]
  );

  const setTaskStatus = useCallback(
    async (taskId: string, status: TaskStatus) => {
      if (!userId) {
        return;
      }

      try {
        await updateTaskStatus(userId, taskId, status);
        setErrorMessage(null);
      } catch {
        setErrorMessage('Nao foi possivel atualizar a tarefa.');
      }
    },
    [userId]
  );

  const deleteTask = useCallback(
    async (taskId: string) => {
      if (!userId) {
        return;
      }

      try {
        await deleteUserTask(userId, taskId);
        setErrorMessage(null);
      } catch {
        setErrorMessage('Nao foi possivel excluir a tarefa.');
      }
    },
    [userId]
  );

  const filteredTasks = useMemo(() => applyFilter(tasks, filter), [filter, tasks]);

  return {
    createTaskDraft,
    createTask,
    deleteTask,
    errorMessage,
    filteredTasks,
    isLoading,
    isSaving,
    setTaskStatus,
    tasks,
    updateTaskDraft,
  };
}
