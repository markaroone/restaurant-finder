import {
  AlertTriangle,
  MapPin,
  MapPinOff,
  RefreshCw,
  SearchX,
  UtensilsCrossed,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/utils/api-error';

type ErrorDisplayProps = {
  error: Error;
  onRetry: () => void;
  onSearch?: (query: string) => void;
};

/**
 * Error state component.
 * - AMBIGUOUS_LOCATION: "Did you mean?" prompt with geoip-derived suggestion chip.
 * - MISSING_LOCATION: prompt to include a location or enable geolocation.
 * - Other 400s: gentle inline hint — the user just needs to rephrase.
 * - Everything else: full error panel with retry button.
 */
export const ErrorDisplay = ({
  error,
  onRetry,
  onSearch,
}: ErrorDisplayProps): ReactNode => {
  const isApiError = error instanceof ApiError;
  const isBadRequest = isApiError && error.status === 400;
  const isAmbiguousLocation =
    isBadRequest && error.meta?.reason === 'AMBIGUOUS_LOCATION';
  const isMissingLocation =
    isBadRequest && isApiError && error.meta?.reason === 'MISSING_LOCATION';
  const isNotFoodRelated =
    isBadRequest && isApiError && error.meta?.reason === 'NOT_FOOD_RELATED';

  // ── Ambiguous location: "Did you mean?" prompt ─────────────
  if (isAmbiguousLocation) {
    const near = String(error.meta?.near ?? '');
    const suggestion = String(error.meta?.suggestion ?? near);
    const query = error.meta?.query ? String(error.meta.query) : '';
    // Reconstruct the full original intent: "[food] in [expanded location]"
    const fullSuggestion =
      query && suggestion !== near ? `${query} in ${suggestion}` : suggestion;
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <MapPin
          className="mb-4 h-10 w-10 text-muted-foreground/50"
          aria-hidden="true"
        />
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t pinpoint{' '}
          <strong className="text-foreground">&quot;{near}&quot;</strong>.{' '}
          Try adding a city or country to your search.
        </p>
        {fullSuggestion && fullSuggestion !== near && (
          <div className="mt-4 flex flex-col items-center gap-2">
            <p className="text-xs text-muted-foreground">Did you mean:</p>
            <button
              onClick={() => onSearch?.(fullSuggestion)}
              className="rounded-full border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none active:scale-95"
              aria-label={`Search for ${fullSuggestion}`}
            >
              {fullSuggestion}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Missing location: Location-specific hint ───────────────
  if (isMissingLocation)
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <MapPinOff
          className="mb-4 h-10 w-10 text-muted-foreground/50"
          aria-hidden="true"
        />
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t determine your location. Try including a city, like{' '}
          <strong className="text-foreground">
            &quot;ramen in Makati City&quot;
          </strong>
          , or enable location access in your browser.
        </p>
      </div>
    );

  // ── Not food related: Food-specific hint ────────────────────
  if (isNotFoodRelated)
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <UtensilsCrossed
          className="mb-4 h-10 w-10 text-muted-foreground/50"
          aria-hidden="true"
        />
        <p className="max-w-sm text-sm text-muted-foreground">
          This app only searches for restaurants and food. Try something like{' '}
          <strong className="text-foreground">&quot;sushi near me&quot;</strong>{' '}
          or{' '}
          <strong className="text-foreground">
            &quot;Italian in Makati&quot;
          </strong>
          .
        </p>
      </div>
    );

  // ── Other 400s: Soft inline hint ───────────────────────────
  if (isBadRequest)
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <SearchX
          className="mb-4 h-10 w-10 text-muted-foreground/50"
          aria-hidden="true"
        />
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t understand that request. Try something like{' '}
          <strong className="text-foreground">
            &quot;sushi in downtown LA&quot;
          </strong>{' '}
          or{' '}
          <strong className="text-foreground">
            &quot;pizza near Times Square&quot;
          </strong>
          .
        </p>
      </div>
    );

  // ── Other errors: Full error panel ─────────────────────────
  const title = isApiError ? error.detail : 'Something went wrong';
  const subtitle = isApiError
    ? `Error ${error.status}: ${error.code}`
    : 'An unexpected error occurred while searching.';

  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-16 text-center">
      <AlertTriangle
        className="mb-4 h-12 w-12 text-destructive"
        aria-hidden="true"
      />
      <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">{subtitle}</p>
      <Button
        onClick={onRetry}
        variant="outline"
        className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        <RefreshCw className="h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
};
