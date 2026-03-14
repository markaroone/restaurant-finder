import { useCallback } from 'react';

import type { ReactElement } from 'react';

import { RestaurantList } from '@/components/restaurant-list';
import { SearchBar } from '@/components/search-bar';
import { useSearchRestaurants } from '@/hooks/use-search-restaurants';
import { formatSearchSummary } from '@/utils/format';

/**
 * Search content area — composes SearchBar with RestaurantList.
 * Extracts data from the query hook and passes narrower props to the list.
 */
export const SearchContent = (): ReactElement => {
  const { data, isLoading, isError, error, queryMessage, triggerSearch } =
    useSearchRestaurants();

  const handleRetry = useCallback(() => {
    if (queryMessage.length > 0) {
      triggerSearch();
    }
  }, [queryMessage, triggerSearch]);

  const results = data?.results ?? [];
  const distanceLabel = data?.meta?.distanceLabel;
  const searchSummary = formatSearchSummary(data?.searchParams, results.length);

  return (
    <div className="mx-auto flex max-w-240 flex-col px-6 py-12 lg:py-20">
      <SearchBar isLoading={isLoading} onSearch={triggerSearch} />

      <div className="mt-12">
        <RestaurantList
          results={results}
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
