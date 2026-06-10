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
