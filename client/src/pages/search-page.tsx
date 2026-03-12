import type { ReactElement } from 'react';

import { AppHeader } from '@/components/app-header';
import { SearchContent } from '@/components/search-content';

/**
 * Main search page layout — header + content area.
 */
export const SearchPage = (): ReactElement => {
  return (
    <main className="min-h-screen bg-background">
      <AppHeader />
      <SearchContent />
    </main>
  );
};
