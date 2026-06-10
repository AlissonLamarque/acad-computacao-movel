import { useCallback, useEffect, useState } from 'react';

import { fetchPrimaryCalendarEvents } from './calendar-service';
import type { GoogleCalendarEvent } from './calendar.types';

export function useCalendarEvents(
  accessToken: string | null | undefined,
  rangeEnd: Date,
  rangeStart: Date
) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [events, setEvents] = useState<GoogleCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setErrorMessage('Entre novamente para conceder acesso a Agenda Google.');
      setEvents([]);
      return;
    }

    setIsLoading(true);

    try {
      const nextEvents = await fetchPrimaryCalendarEvents(accessToken, rangeStart, rangeEnd);
      setEvents(nextEvents);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Nao foi possivel carregar os eventos da Agenda Google.');
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, rangeEnd, rangeStart]);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const refreshTimer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      clearTimeout(refreshTimer);
    };
  }, [accessToken, refresh]);

  return {
    errorMessage,
    events,
    isLoading,
    refresh,
  };
}
