import { useCallback, useMemo } from 'react';

import type { ReactElement } from 'react';

import { RestaurantList } from '@/components/restaurant-list';
import { SearchBar } from '@/components/search-bar';
import { SearchParamsPills } from '@/components/search-params-pills';
import { useFocusOnResults } from '@/hooks/use-focus-on-results';
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
  const { data, distanceLabel, isLoading, isError, error, queryMessage, triggerSearch } =
    useSearchRestaurants();

  const sortBy = useSortBy();

  const handleRetry = useCallback(() => {
    if (queryMessage.length > 0) {
      triggerSearch();
    }
  }, [queryMessage, triggerSearch]);

  const resultsRef = useFocusOnResults(
    data !== null && data.results.length > 0,
  );

  const sortedResults = useMemo(
    () => sortRestaurants(data?.results ?? [], sortBy),
    [data?.results, sortBy],
  );

  const searchSummary = useMemo(
    () => formatSearchSummary(data?.searchParams, sortedResults.length),
    [data?.searchParams, sortedResults.length],
  );

  return (
    <div className="mx-auto flex max-w-5xl flex-col px-6 py-12 lg:py-20">
      <SearchBar isLoading={isLoading} onSearch={triggerSearch} />

      {/* AI Transparency — show what the LLM (or heuristic) extracted */}
      {data?.searchParams && !isLoading && (
        <div className="mt-6">
          <SearchParamsPills
            searchParams={data.searchParams}
            parsedBy={data.meta.parsedBy}
          />
        </div>
      )}

      <div ref={resultsRef} tabIndex={-1} className="mt-8 outline-none">
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
