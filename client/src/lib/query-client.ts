import { QueryClient } from '@tanstack/react-query';

/**
 * Singleton QueryClient instance for the app.
 * Configured with sensible defaults for restaurant search.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60, // 1 min (restaurant queries override to 5 min)
      retry: 1,
    },
  },
});
