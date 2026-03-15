import { Clock, MapPin, Utensils, Wallet } from 'lucide-react';
import type { ReactElement } from 'react';

import type { SearchParams } from '@/types/restaurant';

const PRICE_LABELS: Record<number, string> = {
  1: 'Budget',
  2: 'Moderate',
  3: 'Upscale',
  4: 'Fine Dining',
};

type SearchParamsPillsProps = {
  searchParams: SearchParams;
};

/**
 * Displays pill badges showing what the AI extracted from the user's query.
 * Builds trust by making the LLM interpretation transparent and verifiable.
 */
export const SearchParamsPills = ({
  searchParams,
}: SearchParamsPillsProps): ReactElement => {
  const { query, near, price, open_now } = searchParams;

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-sm"
      aria-label="AI interpretation of your search"
    >
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        AI understood
      </span>

      {/* Cuisine / query */}
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-forest">
        <Utensils className="size-3.5" aria-hidden="true" />
        {query}
      </span>

      {/* Location */}
      {near.length > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-forest">
          <MapPin className="size-3.5" aria-hidden="true" />
          {near}
        </span>
      )}

      {/* Price level */}
      {price !== null && PRICE_LABELS[price] !== undefined && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-forest">
          <Wallet className="size-3.5" aria-hidden="true" />
          {PRICE_LABELS[price]}
        </span>
      )}

      {/* Open now */}
      {open_now && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-forest">
          <Clock className="size-3.5" aria-hidden="true" />
          Open now
        </span>
      )}
    </div>
  );
};
