import { useCallback, useState } from 'react';

import { fetchPrimaryCalendarFreeBusy } from './calendar-service';
import type { CalendarSummary } from './calendar.types';

export function useCalendarFreeBusy(accessToken?: string | null) {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [summary, setSummary] = useState<CalendarSummary | null>(null);

  const refresh = useCallback(async () => {
    if (!accessToken) {
      setErrorMessage('Entre novamente para conceder acesso a Agenda Google.');
      return;
    }

    setIsLoading(true);

    try {
      const nextSummary = await fetchPrimaryCalendarFreeBusy(accessToken);
      setSummary(nextSummary);
      setErrorMessage(null);
    } catch {
      setErrorMessage('Nao foi possivel carregar a Agenda Google.');
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  return {
    errorMessage,
    isLoading,
    refresh,
    summary,
  };
}
