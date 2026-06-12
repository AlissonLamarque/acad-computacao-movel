import type { TaskDraft } from './task.types';

const tagPattern = /#[A-Za-zÀ-ÿ0-9_-]+/g;
const compactDurationPattern = /\b(\d{1,2})h(?:(\d{1,2}))?\b/i;
const minuteDurationPattern = /\b(\d{1,3})\s*(?:min|mins|minuto|minutos|m)\b/i;
const hourDurationPattern = /\b(\d{1,2})\s*(?:h|hora|horas)\b/i;
const datePattern = /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/;

function toDateOnly(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function parseDueDate(input: string, now: Date) {
  const normalized = input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  if (/\bhoje\b/.test(normalized)) {
    return toDateOnly(now);
  }

  if (/\bamanha\b/.test(normalized)) {
    return toDateOnly(addDays(now, 1));
  }

  const dateMatch = input.match(datePattern);

  if (!dateMatch) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const yearInput = dateMatch[3] ? Number(dateMatch[3]) : now.getFullYear();
  const year = yearInput < 100 ? 2000 + yearInput : yearInput;
  const parsedDate = new Date(year, month - 1, day);

  if (
    parsedDate.getFullYear() !== year ||
    parsedDate.getMonth() !== month - 1 ||
    parsedDate.getDate() !== day
  ) {
    return null;
  }

  return toDateOnly(parsedDate);
}

function parseEstimatedMinutes(input: string) {
  const compactDuration = input.match(compactDurationPattern);

  if (compactDuration) {
    const hours = Number(compactDuration[1]);
    const minutes = compactDuration[2] ? Number(compactDuration[2]) : 0;
    return hours * 60 + minutes;
  }

  const minuteDuration = input.match(minuteDurationPattern);

  if (minuteDuration) {
    return Number(minuteDuration[1]);
  }

  const hourDuration = input.match(hourDurationPattern);

  if (hourDuration) {
    return Number(hourDuration[1]) * 60;
  }

  return null;
}

function cleanupTitle(input: string) {
  return input
    .replace(tagPattern, '')
    .replace(compactDurationPattern, '')
    .replace(minuteDurationPattern, '')
    .replace(hourDurationPattern, '')
    .replace(datePattern, '')
    .replace(/\bhoje\b/gi, '')
    .replace(/\bamanh[ãa]\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseBraindump(input: string, now = new Date()): TaskDraft {
  const rawInput = input.trim();
  const tags = Array.from(rawInput.matchAll(tagPattern)).map((match) => match[0].slice(1));
  const title = cleanupTitle(rawInput) || rawInput;

  return {
    category: tags[0] ?? null,
    dueDate: parseDueDate(rawInput, now),
    estimatedMinutes: parseEstimatedMinutes(rawInput),
    notes: null,
    rawInput,
    tags,
    title,
  };
}
