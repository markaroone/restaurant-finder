import type { ReactNode } from 'react';

import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loading state matching the RestaurantCard layout.
 * Shows 3 placeholder cards while results are being fetched.
 */
export const LoadingSkeleton = (): ReactNode => {
  return (
    <div className="space-y-6" role="status" aria-label="Loading results">
      <span className="sr-only">Loading restaurant results…</span>
      {/* Results header skeleton */}
      <div className="flex items-center justify-between px-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-32" />
      </div>

      {/* Card skeletons */}
      {Array.from({ length: 3 }, (_, i) => (
        <div
          key={i}
          className="rounded-xl border border-border bg-card p-6 shadow-sm md:p-8"
        >
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
            <div className="flex-1 space-y-4">
              {/* Category */}
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded-full" />
                <Skeleton className="h-4 w-40" />
              </div>
              {/* Name */}
              <Skeleton className="h-8 w-64" />
              {/* Address */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-52" />
                </div>
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-4" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            </div>
            {/* CTA */}
            <Skeleton className="h-10 w-40 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
};
