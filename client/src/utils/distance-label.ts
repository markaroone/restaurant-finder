import type { ExecuteResponse } from '@/types/restaurant';

type LocationSource = ExecuteResponse['meta']['locationSource'];

/**
 * Builds a human-readable distance suffix from the location source tier.
 * Moved from the backend — this is a pure display concern.
 *
 * @example buildDistanceLabel('near', 'Makati City') // "away from Makati City"
 * @example buildDistanceLabel('browser', '')          // "away from you"
 * @example buildDistanceLabel('ip', '')               // "away from you (approx.)"
 */
export const buildDistanceLabel = (
  source: LocationSource,
  near: string,
): string => {
  switch (source) {
    case 'near':
      return `away from ${near}`;
    case 'browser':
      return 'away from you';
    case 'ip':
      return 'away from you (approx.)';
    default:
      return 'away';
  }
};
