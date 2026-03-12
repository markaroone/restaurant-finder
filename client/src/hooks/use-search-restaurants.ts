import { useCallback, useState } from 'react';

import { useQuery } from '@tanstack/react-query';

import { searchRestaurants } from '@/api/search-restaurants';
import { getSearchState } from '@/stores/search-store';

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
 */
export const useSearchRestaurants = () => {
  const [queryMessage, setQueryMessage] = useState('');

  const triggerSearch = useCallback(() => {
    const { message } = getSearchState();
    setQueryMessage(message);
  }, []);

  const query = useQuery({
    queryKey: ['restaurants', queryMessage],
    queryFn: () => searchRestaurants(queryMessage),
    enabled: queryMessage.length > 0,
    staleTime: 1000 * 60 * 5, // 5 minutes — same query won't re-fetch
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
