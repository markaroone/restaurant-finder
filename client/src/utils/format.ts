/**
 * Formats distance in meters to a human-readable metric string.
 * e.g., 800 → "800 m", 1931 → "1.9 km"
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
};
