import { AlertTriangle, RefreshCw, SearchX } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/utils/api-error';

type ErrorDisplayProps = {
  error: Error;
  onRetry: () => void;
};

/**
 * Error state component.
 * - 400 (bad request): gentle inline hint — the user just needs to rephrase.
 * - Everything else: full error panel with retry button.
 */
export const ErrorDisplay = ({
  error,
  onRetry,
}: ErrorDisplayProps): ReactNode => {
  const isApiError = error instanceof ApiError;
  const isBadRequest = isApiError && error.status === 400;

  // ── 400: Soft inline hint ──────────────────────────────────
  if (isBadRequest)
    return (
      <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <SearchX className="mb-4 h-10 w-10 text-muted-foreground/50" />
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
      <AlertTriangle className="mb-4 h-12 w-12 text-destructive" />
      <h3 className="mb-2 text-xl font-bold text-foreground">{title}</h3>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">{subtitle}</p>
      <Button
        onClick={onRetry}
        variant="outline"
        className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10"
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
};
