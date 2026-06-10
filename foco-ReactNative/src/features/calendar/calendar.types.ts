export type BusyBlock = {
  end: string;
  start: string;
};

export type FreeWindow = {
  end: string;
  minutes: number;
  start: string;
};

export type CalendarSummary = {
  busyBlocks: BusyBlock[];
  busyMinutesToday: number;
  freeWindows: FreeWindow[];
  largestFreeWindowMinutes: number;
};

export type GoogleCalendarEventDate = {
  date?: string;
  dateTime?: string;
  timeZone?: string;
};

export type GoogleCalendarEvent = {
  allDay: boolean;
  colorId: string | null;
  description: string | null;
  end: string;
  id: string;
  location: string | null;
  start: string;
  status: string | null;
  title: string;
};
