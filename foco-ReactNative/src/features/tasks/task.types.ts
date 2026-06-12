export type TaskStatus = 'inbox' | 'planned' | 'done';

export type TaskPriorityLabel = 'Baixa' | 'Media' | 'Alta' | 'Urgente';

export type TaskSource = 'braindump' | 'manual';

export type Task = {
  category: string | null;
  completedAt: string | null;
  createdAt: string;
  dueDate: string | null;
  estimatedMinutes: number | null;
  id: string;
  notes: string | null;
  priorityLabel: TaskPriorityLabel;
  priorityReasons: string[];
  priorityScore: number;
  rawInput: string;
  source: TaskSource;
  status: TaskStatus;
  tags: string[];
  title: string;
  updatedAt: string;
  userId: string;
};

export type TaskDraft = {
  category: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  notes: string | null;
  rawInput: string;
  tags: string[];
  title: string;
};
