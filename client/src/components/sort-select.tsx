import type { ReactElement } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  type SortOption,
  useSortActions,
  useSortBy,
} from '@/stores/sort-store';

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'distance', label: 'Distance' },
];

/**
 * Dropdown to change the client-side sort order of restaurant results.
 * Reads/writes to the sort store — no props needed.
 */
export const SortSelect = (): ReactElement => {
  const sortBy = useSortBy();
  const { setSortBy } = useSortActions();

  return (
    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
      <SelectTrigger
        className="h-8 w-fit border-border text-sm font-medium text-muted-foreground"
        aria-label="Sort results by"
      >
        <span className="text-xs text-muted-foreground">Sort:</span>
        <SelectValue />
      </SelectTrigger>

      <SelectContent position="popper" align="end">
        {SORT_OPTIONS.map(({ value, label }) => (
          <SelectItem key={value} value={value} className="text-sm">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
