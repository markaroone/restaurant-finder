/**
 * Formats distance in meters to a human-readable metric string.
 * e.g., 800 → "800 m", 1931 → "1.9 km"
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};

import type { SearchParams } from '@/types/restaurant';

/**
 * Builds a human-readable search summary from params and result count.
 * Example: '10 results for "tacos" nearby' or '3 results for "sushi" near La Union'
 */
export const formatSearchSummary = (
  searchParams: SearchParams | undefined,
  resultCount: number,
): string | undefined => {
  if (!searchParams) return undefined;
  const { query, near } = searchParams;
  const location = near ? `near ${near}` : 'nearby';
  return `${resultCount} result${resultCount !== 1 ? 's' : ''} for "${query}" ${location}`;
};
