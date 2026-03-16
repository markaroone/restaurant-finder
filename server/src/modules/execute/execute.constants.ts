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

/**
 * Maps ISO 3166-1 alpha-2 country codes to full English country names.
 * Covers the most common countries; falls back to the raw code for unlisted entries.
 */
export const ISO_COUNTRY_NAMES = {
  PH: 'Philippines',
  US: 'United States',
  GB: 'United Kingdom',
  AU: 'Australia',
  CA: 'Canada',
  JP: 'Japan',
  KR: 'South Korea',
  SG: 'Singapore',
  MY: 'Malaysia',
  TH: 'Thailand',
  ID: 'Indonesia',
  VN: 'Vietnam',
  IN: 'India',
  CN: 'China',
  FR: 'France',
  DE: 'Germany',
  ES: 'Spain',
  IT: 'Italy',
  PT: 'Portugal',
  AE: 'United Arab Emirates',
  SA: 'Saudi Arabia',
  MX: 'Mexico',
  BR: 'Brazil',
  NZ: 'New Zealand',
} as const;
