import type { BusyBlock, CalendarSummary, FreeWindow } from './calendar.types';

type FreeBusyResponse = {
  calendars?: Record<string, { busy?: BusyBlock[] }>;
};

function clampDate(date: Date, minDate: Date, maxDate: Date) {
  if (date < minDate) {
    return minDate;
  }

  if (date > maxDate) {
    return maxDate;
  }

  return date;
}

function minutesBetween(start: Date, end: Date) {
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
}

export function getTodayRange(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  return { end, start };
}

export function summarizeBusyBlocks(
  busyBlocks: BusyBlock[],
  rangeStart: Date,
  rangeEnd: Date
): CalendarSummary {
  const sortedBlocks = [...busyBlocks].sort(
    (firstBlock, secondBlock) =>
      new Date(firstBlock.start).getTime() - new Date(secondBlock.start).getTime()
  );

  const freeWindows: FreeWindow[] = [];
  let cursor = rangeStart;
  let busyMinutesToday = 0;

  sortedBlocks.forEach((block) => {
    const blockStart = clampDate(new Date(block.start), rangeStart, rangeEnd);
    const blockEnd = clampDate(new Date(block.end), rangeStart, rangeEnd);

    if (blockEnd <= rangeStart || blockStart >= rangeEnd) {
      return;
    }

    if (blockStart > cursor) {
      freeWindows.push({
        end: blockStart.toISOString(),
        minutes: minutesBetween(cursor, blockStart),
        start: cursor.toISOString(),
      });
    }

    busyMinutesToday += minutesBetween(blockStart, blockEnd);

    if (blockEnd > cursor) {
      cursor = blockEnd;
    }
  });

  if (cursor < rangeEnd) {
    freeWindows.push({
      end: rangeEnd.toISOString(),
      minutes: minutesBetween(cursor, rangeEnd),
      start: cursor.toISOString(),
    });
  }

  return {
    busyBlocks: sortedBlocks,
    busyMinutesToday,
    freeWindows,
    largestFreeWindowMinutes: freeWindows.reduce(
      (largestWindow, window) => Math.max(largestWindow, window.minutes),
      0
    ),
  };
}

export async function fetchPrimaryCalendarFreeBusy(accessToken: string, now = new Date()) {
  const { end, start } = getTodayRange(now);
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    body: JSON.stringify({
      items: [{ id: 'primary' }],
      timeMax: end.toISOString(),
      timeMin: start.toISOString(),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    }),
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Could not fetch Google Calendar free/busy data.');
  }

  const data = (await response.json()) as FreeBusyResponse;
  const busyBlocks = data.calendars?.primary?.busy ?? [];

  return summarizeBusyBlocks(busyBlocks, start, end);
}
