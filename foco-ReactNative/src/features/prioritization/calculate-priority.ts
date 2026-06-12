import type { TaskPriorityLabel } from '@/features/tasks/task.types';

export type PriorityInput = {
  category?: string | null;
  createdAt?: string;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
  status?: string;
  tags?: string[];
};

export type CalendarPriorityContext = {
  busyMinutesToday?: number;
  largestFreeWindowMinutes?: number;
};

export type PriorityResult = {
  priorityLabel: TaskPriorityLabel;
  priorityReasons: string[];
  priorityScore: number;
};

const categoryWeights: Record<string, number> = {
  faculdade: 25,
  trabalho: 20,
  saude: 18,
  saude_: 18,
  financeiro: 15,
  casa: 8,
};

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function parseDateOnly(dateValue: string) {
  const [year, month, day] = dateValue.split('-').map(Number);

  if (!year || !month || !day) {
    return null;
  }

  return new Date(year, month - 1, day);
}

function differenceInDays(dateValue: string, now: Date) {
  const dueDate = parseDateOnly(dateValue);

  if (!dueDate) {
    return null;
  }

  const today = parseDateOnly(toDateOnly(now));

  if (!today) {
    return null;
  }

  return Math.round((dueDate.getTime() - today.getTime()) / 86400000);
}

function normalizeTag(tag: string) {
  return tag
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getPriorityLabel(score: number): TaskPriorityLabel {
  if (score >= 80) {
    return 'Urgente';
  }

  if (score >= 50) {
    return 'Alta';
  }

  if (score >= 25) {
    return 'Media';
  }

  return 'Baixa';
}

export function calculateTaskPriority(
  task: PriorityInput,
  options: { calendar?: CalendarPriorityContext; now?: Date } = {}
): PriorityResult {
  const now = options.now ?? new Date();
  let score = 0;
  const reasons: string[] = [];

  if (task.status === 'done') {
    return {
      priorityLabel: 'Baixa',
      priorityReasons: ['tarefa concluida'],
      priorityScore: 0,
    };
  }

  if (task.dueDate) {
    const dueDiff = differenceInDays(task.dueDate, now);

    if (dueDiff !== null) {
      if (dueDiff < 0) {
        score += 60;
        reasons.push('atrasada');
      } else if (dueDiff === 0) {
        score += 40;
        reasons.push('vence hoje');
      } else if (dueDiff === 1) {
        score += 30;
        reasons.push('vence amanha');
      } else if (dueDiff <= 3) {
        score += 18;
        reasons.push('prazo proximo');
      }
    }
  }

  const categoryCandidates = [task.category, ...(task.tags ?? [])].filter(Boolean) as string[];
  const categoryScore = categoryCandidates.reduce((currentScore, category) => {
    const normalized = normalizeTag(category);
    return Math.max(currentScore, categoryWeights[normalized] ?? 0);
  }, 0);

  if (categoryScore > 0) {
    score += categoryScore;
    reasons.push('categoria relevante');
  }

  if (task.estimatedMinutes) {
    if (task.estimatedMinutes <= 30) {
      score += 10;
      reasons.push('execucao rapida');
    } else if (task.estimatedMinutes > 120) {
      score -= 5;
      reasons.push('tarefa longa');
    }
  }

  if (task.createdAt) {
    const createdAt = new Date(task.createdAt);
    const ageInDays = Math.max(0, Math.floor((now.getTime() - createdAt.getTime()) / 86400000));

    if (ageInDays >= 3) {
      const ageScore = Math.min(18, ageInDays * 3);
      score += ageScore;
      reasons.push('esta na lista ha alguns dias');
    }
  }

  if (options.calendar && task.estimatedMinutes) {
    const largestFreeWindow = options.calendar.largestFreeWindowMinutes ?? 0;
    const busyMinutesToday = options.calendar.busyMinutesToday ?? 0;

    if (largestFreeWindow >= task.estimatedMinutes) {
      score += 15;
      reasons.push('cabe na agenda hoje');
    } else if (busyMinutesToday >= 360 && task.estimatedMinutes > 60) {
      score -= 10;
      reasons.push('dia cheio para tarefa longa');
    }
  }

  const finalScore = Math.max(0, Math.round(score));

  return {
    priorityLabel: getPriorityLabel(finalScore),
    priorityReasons: reasons.length > 0 ? reasons : ['sem sinais fortes ainda'],
    priorityScore: finalScore,
  };
}
