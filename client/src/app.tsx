import { type ReactNode, useEffect } from 'react';

import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';

import { queryClient } from '@/lib/query-client';
import { SearchPage } from '@/pages/search-page';
import { useGeolocationActions } from '@/stores/geolocation-store';

/**
 * Root App component with providers.
 * Requests geolocation on mount for location fallback.
 */
export const App = (): ReactNode => {
  const { requestLocation } = useGeolocationActions();

  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return (
    <QueryClientProvider client={queryClient}>
      <SearchPage />
      <Toaster richColors position="bottom-center" />
    </QueryClientProvider>
  );
};
