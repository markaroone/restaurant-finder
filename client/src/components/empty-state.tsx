import { Search, UtensilsCrossed } from 'lucide-react';
import type { ReactNode } from 'react';

type EmptyStateProps = {
  /** True when there are no results for a query, false for initial state */
  hasSearched: boolean;
};

const EXAMPLE_QUERIES = [
  '"sushi in downtown LA"',
  '"best tacos near Times Square"',
  '"healthy food in San Francisco"',
  '"pizza in Brooklyn"',
];

/**
 * Empty state with two modes:
 * 1. Initial — encouraging text with example queries
 * 2. No results — suggests trying a different query
 */
export const EmptyState = ({ hasSearched }: EmptyStateProps): ReactNode => {
  if (hasSearched) {
    return (
      <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
        <UtensilsCrossed className="mb-4 h-16 w-16 text-muted-foreground/40" />
        <h3 className="mb-2 text-xl font-bold text-foreground">
          No restaurants found
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          We couldn&apos;t find any matches. Try a different cuisine or
          location, like &quot;Italian in Manhattan&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
      <Search className="mb-4 h-16 w-16 text-muted-foreground/30" />
      <h3 className="mb-2 text-xl font-bold text-foreground">
        Describe what you&apos;re craving
      </h3>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">
        Type a natural language query and we&apos;ll find restaurants for you.
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        {EXAMPLE_QUERIES.map((query) => (
          <span
            key={query}
            className="rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground"
          >
            {query}
          </span>
        ))}
      </div>
    </div>
  );
};
