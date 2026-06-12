import type { TaskCategory } from './category.types';

export const defaultCategories: TaskCategory[] = [
  {
    color: '#2563eb',
    id: 'faculdade',
    label: 'Faculdade',
    priorityWeight: 25,
  },
  {
    color: '#0f766e',
    id: 'trabalho',
    label: 'Trabalho',
    priorityWeight: 20,
  },
  {
    color: '#b91c1c',
    id: 'saude',
    label: 'Saude',
    priorityWeight: 18,
  },
  {
    color: '#7c3aed',
    id: 'financeiro',
    label: 'Financeiro',
    priorityWeight: 15,
  },
  {
    color: '#c2410c',
    id: 'casa',
    label: 'Casa',
    priorityWeight: 8,
  },
  {
    color: '#475569',
    id: 'pessoal',
    label: 'Pessoal',
    priorityWeight: 6,
  },
];

export function getCategoryById(categoryId: string | null | undefined) {
  return defaultCategories.find((category) => category.id === categoryId) ?? null;
}
