import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { Toaster } from 'sonner';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60, // 1 minute
      retry: 1,
    },
  },
});

export const App = (): ReactNode => {
  return (
    <QueryClientProvider client={queryClient}>
      <main className="min-h-screen bg-background">
        {/* TODO: Replace with SearchPage component in Phase 3 */}
        <div className="flex min-h-screen items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold text-foreground">
              🍽️ Restaurant Finder
            </h1>
            <p className="text-muted-foreground">
              Find restaurants by describing what you want.
            </p>
          </div>
        </div>
      </main>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  );
};
