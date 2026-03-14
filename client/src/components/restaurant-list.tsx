import { Fragment, type ReactElement } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorDisplay } from '@/components/error-display';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { RestaurantCard } from '@/components/restaurant-card';
import type { Restaurant } from '@/types/restaurant';

type RestaurantListProps = {
  /** Pre-sorted restaurant results from query `select`. */
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
}: RestaurantListProps): ReactElement => {
  if (isLoading) return <LoadingSkeleton />;

  if (isError && error != null)
    return <ErrorDisplay error={error} onRetry={onRetry} />;

  const hasResults = results.length > 0;

  if (!hasResults && hasSearched) return <EmptyState hasSearched />;

  if (!hasSearched) return <EmptyState hasSearched={false} />;

  return (
    <Fragment>
      {/* Results header */}
      <div className="mb-8 flex items-center justify-between px-2">
        <h2 className="text-2xl font-bold tracking-tight text-forest">
          Top Recommendations
        </h2>
        {searchSummary && (
          <span className="text-sm font-medium text-muted-foreground">
            {searchSummary}
          </span>
        )}
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
    </Fragment>
  );
};
