import type { ReactElement } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorDisplay } from '@/components/error-display';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { RestaurantCard } from '@/components/restaurant-card';
import { SortSelect } from '@/components/sort-select';
import type { Restaurant } from '@/types/restaurant';

type RestaurantListProps = {
  /** Restaurant results (sorted by the UI layer). */
  results: Restaurant[];
  /** e.g. '3 results for "sushi" near La Union' or '10 results for "tacos" nearby'. */
  searchSummary?: string;
  /** Contextual distance label, e.g. 'away from La Union' or 'away from you'. */
  distanceLabel?: string;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasSearched: boolean;
  onRetry: () => void;
  /** Called with the suggestion string when the user clicks a "Did you mean?" chip. */
  onSearch?: (query: string) => void;
};

/**
 * Restaurant results list — owns all conditional rendering.
 * Receives pre-extracted props and renders the appropriate UI:
 * loading skeleton, error, empty, or results list.
 */
export const RestaurantList = ({
  results,
  searchSummary,
  distanceLabel,
  isLoading,
  isError,
  error,
  hasSearched,
  onRetry,
  onSearch,
}: RestaurantListProps): ReactElement => {
  if (isLoading)
    return (
      <div role="status" aria-live="polite" aria-label="Search results">
        <LoadingSkeleton />
      </div>
    );

  if (isError && error !== null)
    return (
      <div role="region" aria-live="polite" aria-label="Search results">
        <ErrorDisplay error={error} onRetry={onRetry} onSearch={onSearch} />
      </div>
    );

  const hasResults = results.length > 0;

  if (!hasResults && hasSearched)
    return (
      <div role="region" aria-live="polite" aria-label="Search results">
        <EmptyState hasSearched />
      </div>
    );

  if (!hasSearched) return <EmptyState hasSearched={false} />;

  return (
    <div role="region" aria-live="polite" aria-label="Search results">
      {/* Results header */}
      <div className="mb-8 flex items-center justify-between px-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-forest">
            Top Recommendations
          </h2>
          {searchSummary && (
            <span className="text-sm font-medium text-muted-foreground">
              {searchSummary}
            </span>
          )}
        </div>
        <SortSelect />
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-6">
        {results.map((restaurant, index) => (
          <RestaurantCard
            key={restaurant.id}
            restaurant={restaurant}
            alternate={index % 2 !== 0}
            distanceLabel={distanceLabel}
          />
        ))}
      </div>
    </div>
  );
};
