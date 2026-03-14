import { useCallback, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { searchRestaurants } from '@/api/search-restaurants';
import { getGeolocationState } from '@/stores/geolocation-store';
import { getSearchState } from '@/stores/search-store';

/**
 * Restaurant results are stable — same query returns the same data.
 * Intentionally longer than the global default (1 min) to avoid
 * redundant API calls (each triggers Gemini + Foursquare costs).
 */
const RESTAURANT_STALE_TIME = 1000 * 60 * 5; // 5 minutes

/**
 * TanStack Query hook for restaurant search results.
 *
 * Does NOT subscribe to the Zustand store — instead, `triggerSearch()`
 * imperatively reads the store via `getState()` and copies the message
 * into local `useState`. This prevents re-renders when the store
 * updates (e.g., from SearchBar submitting).
 *
 * Re-renders only happen when:
 * 1. `triggerSearch()` is called (local state changes)
 * 2. The query resolves/errors (TanStack Query state changes)
 *
 * NOTE: No `select` callback — returning raw data preserves React Query's
 * structural sharing, which reuses object references across re-renders
 * and avoids unnecessary downstream re-renders.
 */
export const useSearchRestaurants = () => {
  const [queryMessage, setQueryMessage] = useState('');
  const [ll, setLl] = useState<string | null>(null);

  const triggerSearch = useCallback(() => {
    const { message } = getSearchState();
    const { lat, lng, status } = getGeolocationState();

    setQueryMessage(message);
    setLl(
      status === 'granted' && lat !== null && lng !== null
        ? `${lat},${lng}`
        : null,
    );
  }, []);

  const query = useQuery({
    queryKey: ['restaurants', queryMessage, ll],
    queryFn: () => searchRestaurants(queryMessage, ll),
    enabled: queryMessage.length > 0,
    staleTime: RESTAURANT_STALE_TIME,
    retry: 1,
  });

  return {
    data: query.data?.data ?? null,
    isLoading: query.isLoading || query.isFetching,
    isError: query.isError,
    error: query.error,
    queryMessage,
    triggerSearch,
  };
};
