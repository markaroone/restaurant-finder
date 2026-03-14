import type { Restaurant } from '@/types/restaurant';

/**
 * Sorts an array of restaurants based on the specified criteria.
 * This is a pure function and is safe to use within `useMemo`.
 *
 * @param {Restaurant[]} results - The array of restaurants to sort.
 * @param {'relevance' | 'distance'} sortBy - The sorting criteria to apply.
 *   - 'relevance': Returns the array as-is (assuming relevance order is preserved from the API).
 *   - 'distance': Sorts from nearest to farthest, placing restaurants with null distance at the end.
 * @returns {Restaurant[]} A new sorted array of restaurants.
 */
export const sortRestaurants = (
  results: Restaurant[],
  sortBy: 'relevance' | 'distance',
): Restaurant[] => {
  if (sortBy === 'relevance') return results;

  return [...results].sort((a, b) => {
    if (a.distance == null && b.distance == null) return 0;
    if (a.distance == null) return 1;
    if (b.distance == null) return -1;
    return a.distance - b.distance;
  });
};
