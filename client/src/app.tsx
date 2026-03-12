import { QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

import { queryClient } from '@/lib/query-client';
import { SearchPage } from '@/pages/search-page';

/**
 * Root App component with providers.
 */
export const App = (): ReactNode => {
  return (
    <QueryClientProvider client={queryClient}>
      <SearchPage />
      <Toaster richColors position="bottom-center" />
    </QueryClientProvider>
  );
};
