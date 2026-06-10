import { useCallback, useEffect, useState } from 'react';

import { fetchPrimaryCalendarFreeBusy } from './calendar-service';
import type { CalendarSummary } from './calendar.types';

export function useCalendarFreeBusy(accessToken?: string | null, selectedDate?: Date | null) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);

  const refresh = useCallback(async () => {
    if (!selectedDate) {
      setErrorMessage(null);
      setSummary(null);
      return;
    }

    if (!accessToken) {
      setErrorMessage('Entre novamente para conceder acesso a Agenda Google.');
      setSummary(null);
      return;
    }

    setIsLoading(true);

    try {
      const nextSummary = await fetchPrimaryCalendarFreeBusy(accessToken, selectedDate);
      setSummary(nextSummary);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Nao foi possivel carregar a Agenda Google.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, selectedDate]);

  useEffect(() => {
    const refreshTimer = setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      clearTimeout(refreshTimer);
    };
  }, [refresh]);

  return {
    errorMessage,
    isLoading,
    refresh,
    summary,
  };
}
