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
import {
  isAmbiguousLocationError,
  isBadRequestError,
  isMissingLocationError,
  isNotFoodRelatedError,
} from '@/utils/error-guards';

type ErrorDisplayProps = {
  error: Error;
  onRetry: () => void;
};

/**
 * Error state component.
 * - AMBIGUOUS_LOCATION: prompt to add a city or country.
 * - MISSING_LOCATION: prompt to include a location or enable geolocation.
 * - Other 400s: gentle inline hint — the user just needs to rephrase.
 * - Everything else: full error panel with retry button.
 */
export const ErrorDisplay = ({
  error,
  onRetry,
}: ErrorDisplayProps): ReactNode => {
  // ── Ambiguous location: prompt to add city/country ─────────
  if (isAmbiguousLocationError(error)) {
    const near = String(error.meta?.near ?? '');
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <MapPin
          className="mb-4 h-10 w-10 text-muted-foreground/50"
          aria-hidden="true"
        />
        <p className="max-w-sm text-sm text-muted-foreground">
          We couldn&apos;t pinpoint{' '}
          <strong className="text-foreground">&quot;{near}&quot;</strong>. Try
          adding a city or country to your search.
        </p>
      </div>
    );
  }

  // ── Missing location: Location-specific hint ───────────────
  if (isMissingLocationError(error))
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
  if (isNotFoodRelatedError(error))
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
  if (isBadRequestError(error))
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
  const isApi = error instanceof ApiError;
  const title = isApi ? error.detail : 'Something went wrong';
  const subtitle = isApi
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
