import type {
  BusyBlock,
  CalendarSummary,
  FreeWindow,
  GoogleCalendarEvent,
  GoogleCalendarEventDate,
} from './calendar.types';

type FreeBusyResponse = {
  calendars?: Record<string, { busy?: BusyBlock[] }>;
};

type GoogleCalendarApiEvent = {
  colorId?: string;
  description?: string;
  end?: GoogleCalendarEventDate;
  id?: string;
  location?: string;
  start?: GoogleCalendarEventDate;
  status?: string;
  summary?: string;
};

type GoogleCalendarEventsResponse = {
  items?: GoogleCalendarApiEvent[];
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
  const normalizedBusyBlocks: BusyBlock[] = [];
  let cursor = rangeStart;
  let busyMinutesToday = 0;

  sortedBlocks.forEach((block) => {
    const blockStart = clampDate(new Date(block.start), rangeStart, rangeEnd);
    const blockEnd = clampDate(new Date(block.end), rangeStart, rangeEnd);

    if (blockEnd <= rangeStart || blockStart >= rangeEnd) {
      return;
    }

    normalizedBusyBlocks.push({
      end: blockEnd.toISOString(),
      start: blockStart.toISOString(),
    });

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
    busyBlocks: normalizedBusyBlocks,
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

function resolveEventDate(value: GoogleCalendarEventDate | undefined, fallback: Date) {
  if (value?.dateTime) {
    return {
      allDay: false,
      value: value.dateTime,
    };
  }

  if (value?.date) {
    return {
      allDay: true,
      value: new Date(`${value.date}T00:00:00`).toISOString(),
    };
  }

  return {
    allDay: false,
    value: fallback.toISOString(),
  };
}

export async function fetchPrimaryCalendarEvents(
  accessToken: string,
  rangeStart: Date,
  rangeEnd: Date
): Promise<GoogleCalendarEvent[]> {
  const searchParams = new URLSearchParams({
    maxResults: '250',
    orderBy: 'startTime',
    showDeleted: 'false',
    singleEvents: 'true',
    timeMax: rangeEnd.toISOString(),
    timeMin: rangeStart.toISOString(),
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      method: 'GET',
    }
  );

  if (!response.ok) {
    throw new Error('Could not fetch Google Calendar events.');
  }

  const data = (await response.json()) as GoogleCalendarEventsResponse;

  return (data.items ?? [])
    .filter((event) => event.status !== 'cancelled')
    .map((event, index) => {
      const start = resolveEventDate(event.start, rangeStart);
      const end = resolveEventDate(event.end, new Date(start.value));

      return {
        allDay: start.allDay,
        colorId: event.colorId ?? null,
        description: event.description ?? null,
        end: end.value,
        id: event.id ?? `google-event-${index}`,
        location: event.location ?? null,
        start: start.value,
        status: event.status ?? null,
        title: event.summary ?? 'Evento sem titulo',
      };
    });
}
