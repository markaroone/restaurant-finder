import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { ApiError } from '@/utils/api-error';

type ErrorDisplayProps = {
  error: Error;
  onRetry: () => void;
};

/**
 * Error state component with icon, message, and retry button.
 * Extracts user-friendly details from ApiError when available.
 */
export const ErrorDisplay = ({
  error,
  onRetry,
}: ErrorDisplayProps): ReactNode => {
  const isApiError = error instanceof ApiError;
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
