import {
  type ChangeEvent,
  type ReactElement,
  useCallback,
  useState,
} from 'react';

import { Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSearchActions } from '@/stores/search-store';
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

  return (
    <div className="text-center">
      <h1 className="text-4xl leading-tight font-extrabold tracking-tight text-forest lg:text-5xl">
        Find your next meal
      </h1>
      <p className="mt-3 text-muted-foreground">
        Describe what you&apos;re craving and we&apos;ll find it for you.
      </p>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 w-full max-w-2xl">
        <div className="flex h-14 w-full items-stretch overflow-hidden rounded-xl border border-border shadow-lg">
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
            onChange={(e) => setValue(e.target.value)}
            disabled={isLoading}
            maxLength={500}
          />
          <div className="flex items-center bg-card pr-3">
            <Button
              type="submit"
              disabled={isLoading || value.trim().length < 2}
              className="rounded-lg bg-primary px-6 font-bold text-primary-foreground hover:bg-primary/90"
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
            onClick={() => handleChipClick(chip.query)}
            disabled={isLoading}
            className={cn(
              'flex items-center gap-2 rounded-full border border-border bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition-all',
              'hover:border-forest/20 hover:shadow-sm',
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
