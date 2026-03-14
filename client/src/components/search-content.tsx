import { useCallback, useMemo } from 'react';

import type { ReactElement } from 'react';

import { RestaurantList } from '@/components/restaurant-list';
import { SearchBar } from '@/components/search-bar';
import { useSearchRestaurants } from '@/hooks/use-search-restaurants';
import { useSortBy } from '@/stores/sort-store';
import { formatSearchSummary } from '@/utils/format';
import { sortRestaurants } from '@/utils/sort';



/**
 * Search content area — composes SearchBar with RestaurantList.
 * Extracts data from the query hook and passes narrower props to the list.
 * Owns client-side sorting via useMemo, keyed on [results, sortBy].
 */
export const SearchContent = (): ReactElement => {
  const { data, isLoading, isError, error, queryMessage, triggerSearch } =
    useSearchRestaurants();

  const sortBy = useSortBy();

  const handleRetry = useCallback(() => {
    if (queryMessage.length > 0) {
      triggerSearch();
    }
  }, [queryMessage, triggerSearch]);

  const sortedResults = useMemo(
    () => sortRestaurants(data?.results ?? [], sortBy),
    [data?.results, sortBy],
  );

  const distanceLabel = data?.meta?.distanceLabel;
  const searchSummary = useMemo(
    () => formatSearchSummary(data?.searchParams, sortedResults.length),
    [data?.searchParams, sortedResults.length],
  );

  return (
    <div className="mx-auto flex max-w-240 flex-col px-6 py-12 lg:py-20">
      <SearchBar isLoading={isLoading} onSearch={triggerSearch} />

      <div className="mt-12">
        <RestaurantList
          results={sortedResults}
          searchSummary={searchSummary}
          distanceLabel={distanceLabel}
          isLoading={isLoading}
          isError={isError}
          error={error}
          hasSearched={queryMessage.length > 0}
          onRetry={handleRetry}
        />
      </div>
    </div>
  );
};
