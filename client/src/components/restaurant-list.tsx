import { Fragment, type ReactElement } from 'react';

import { EmptyState } from '@/components/empty-state';
import { ErrorDisplay } from '@/components/error-display';
import { LoadingSkeleton } from '@/components/loading-skeleton';
import { RestaurantCard } from '@/components/restaurant-card';
import type { ExecuteResponse } from '@/types/restaurant';

type RestaurantListProps = {
  data: ExecuteResponse | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  hasSearched: boolean;
  onRetry: () => void;
};

/**
 * Restaurant results list — owns all conditional rendering.
 * Receives state props and renders the appropriate UI:
 * loading skeleton, error, empty, or results list.
 */
export const RestaurantList = ({
  data,
  isLoading,
  isError,
  error,
  hasSearched,
  onRetry,
}: RestaurantListProps): ReactElement => {
  if (isLoading) return <LoadingSkeleton />;

  if (isError && error != null)
    return <ErrorDisplay error={error} onRetry={onRetry} />;

  // Results arrive pre-sorted by distance from query `select`
  const results = data?.results ?? [];
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
        {data?.searchParams != null && (
          <span className="text-sm font-medium text-muted-foreground">
            {results.length} result{results.length !== 1 ? 's' : ''} for &quot;
            {data.searchParams.query}&quot;{' '}
            {data.searchParams.near
              ? `near ${data.searchParams.near}`
              : 'nearby'}
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
            distanceLabel={data?.meta?.distanceLabel}
          />
        ))}
      </div>
    </Fragment>
  );
};
