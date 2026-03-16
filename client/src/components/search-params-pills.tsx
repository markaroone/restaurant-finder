import { Clock, MapPin, Utensils, Wallet, Zap } from 'lucide-react';
import type { ReactElement } from 'react';

import { formatPriceLabel } from '@/lib/format-price';
import type { SearchParams } from '@/types/restaurant';

type SearchParamsPillsProps = {
  searchParams: SearchParams;
  parsedBy?: 'llm' | 'heuristic';
};

/**
 * Displays pill badges showing what the AI (or heuristic fallback) extracted
 * from the user's query. Builds trust by making the interpretation transparent.
 * When the heuristic fallback ran (Gemini unavailable), a ⚡ badge is shown.
 */
export const SearchParamsPills = ({
  searchParams,
  parsedBy = 'llm',
}: SearchParamsPillsProps): ReactElement => {
  const { query, near, min_price, max_price, open_now } = searchParams;
  const isHeuristic = parsedBy === 'heuristic';
  const priceLabel = formatPriceLabel(min_price, max_price);

  return (
    <div
      className="flex flex-wrap items-center gap-2 text-sm"
      aria-label={
        isHeuristic
          ? 'Quick interpretation of your search (AI unavailable)'
          : 'AI interpretation of your search'
      }
    >
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {isHeuristic ? 'Understood' : 'AI understood'}
      </span>

      {/* Heuristic mode indicator */}
      {isHeuristic && (
        <span
          className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 font-medium text-amber-600 dark:text-amber-400"
          title="AI service is currently unavailable — using quick local parsing instead"
        >
          <Zap className="size-3.5" aria-hidden="true" />
          Quick mode
        </span>
      )}

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
      {priceLabel !== null && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1 font-medium text-forest">
          <Wallet className="size-3.5" aria-hidden="true" />
          {priceLabel}
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
