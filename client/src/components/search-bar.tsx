import {
  type ChangeEvent,
  type ReactElement,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { Search, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchActions, useSearchMessage } from '@/stores/search-store';
import { cn } from '@/utils/cn';
import { getQuickSearches } from '@/utils/quick-searches';

type SearchBarProps = {
  isLoading: boolean;
  /** Called after the store is updated, to trigger the query. */
  onSearch: () => void;
};

/**
 * Main search bar with input, submit button, and quick-search chips.
 * Owns its own input state (local). Only calls the Zustand store on submit.
 * This means typing does NOT cause re-renders in the results area.
 */
export const SearchBar = ({
  isLoading,
  onSearch,
}: SearchBarProps): ReactElement => {
  const [value, setValue] = useState('');
  const [quickSearches] = useState(() => getQuickSearches());
  const { search } = useSearchActions();
  const searchMessage = useSearchMessage();

  /**
   * Sync local input value when the store message changes externally
   * (e.g. from the "Did you mean?" chip in ErrorDisplay).
   */
  useEffect(() => {
    if (searchMessage && searchMessage !== value) {
      setValue(searchMessage);
    }
    // Only react to store changes, not local typing
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchMessage]);

  const handleSubmit = useCallback(
    (e: ChangeEvent) => {
      e.preventDefault();
      const trimmed = value.trim();
      if (trimmed.length >= 2) {
        search(trimmed);
        onSearch();
      }
    },
    [value, search, onSearch],
  );

  const handleChipClick = useCallback(
    (query: string) => {
      setValue(query);
      search(query);
      onSearch();
    },
    [search, onSearch],
  );

  const handleResetSearchBar = useCallback(() => {
    setValue('');
  }, []);

  const handleSetInputValue = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setValue(event.target.value);
    },
    [],
  );

  return (
    <div className="text-center">
      <h1 className="text-4xl leading-none font-extrabold tracking-tight text-forest lg:text-5xl lg:leading-none">
        Find your next meal
      </h1>
      <p className="mt-3 text-muted-foreground">
        Describe what you&apos;re craving and we&apos;ll find it for you.
      </p>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 w-full max-w-2xl">
        <div className="flex h-14 w-full items-stretch overflow-hidden rounded-xl border border-border shadow-lg transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
          <div className="flex items-center justify-center bg-card pl-5">
            <Search
              className="h-5 w-5 text-muted-foreground"
              aria-hidden="true"
            />
          </div>

          <Input
            aria-label="Search for restaurants"
            className="h-full flex-1 border-none bg-card text-lg font-medium shadow-none focus-visible:ring-0"
            placeholder="Try 'sushi in downtown LA'..."
            value={value}
            onChange={handleSetInputValue}
            disabled={isLoading}
            maxLength={500}
          />

          {value.length > 0 && !isLoading && (
            <button
              type="button"
              onClick={handleResetSearchBar}
              className="flex items-center justify-center bg-card px-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset active:scale-95"
              aria-label="Clear search"
            >
              <X className="size-4" />
            </button>
          )}

          <div className="flex items-center bg-card pr-3">
            <Button
              type="submit"
              disabled={isLoading || value.trim().length < 2}
              className="rounded-md bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? 'Searching...' : 'Search'}
            </Button>
          </div>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {quickSearches.map((chip) => (
          <button
            key={chip.label}
            type="button"
            onClick={handleChipClick.bind(null, chip.query)}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground transition-all',
              'hover:border-forest/20 hover:shadow-sm',
              'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'active:scale-[0.97] active:shadow-none',
              'disabled:cursor-not-allowed disabled:opacity-50',
            )}
          >
            <chip.icon className="h-4 w-4 text-forest" aria-hidden="true" />
            {chip.label}
          </button>
        ))}
      </div>
    </div>
  );
};
