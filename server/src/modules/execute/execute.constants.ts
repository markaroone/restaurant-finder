/**
 * Placeholder location strings the LLM sometimes produces
 * (e.g., "near me" → near: "current location"). Foursquare can't resolve these,
 * so they are stripped to trigger the browser/IP geolocation fallback.
 */
export const PLACEHOLDER_LOCATIONS = [
  'current location',
  'near me',
  'my location',
  'my area',
  'nearby',
  'here',
];
