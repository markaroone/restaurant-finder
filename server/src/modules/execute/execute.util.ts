import { BadRequestError } from '@/common/utils/api-errors';
import { resolveIpLocation } from '@/common/utils/geoip';
import { PLACEHOLDER_LOCATIONS } from '@/modules/execute/execute.constants';
import { TransformedRestaurant } from '@/modules/execute/execute.types';
import { FoursquarePlace } from '@/services/foursquare';

// ─── Transform Helpers ───────────────────────────────────────────────

/**
 * Transforms a raw Foursquare place into our clean client-facing shape.
 * Premium fields (price, rating, hours, geocodes) are not available on the
 * free tier, so they always return null. The types still include them for
 * forward-compatibility if the user upgrades their Foursquare plan.
 */
const transformPlace = (place: FoursquarePlace): TransformedRestaurant => ({
  id: place.fsq_place_id ?? crypto.randomUUID(),
  name: place.name ?? 'Unknown',
  address:
    place.location?.formatted_address &&
    place.location.formatted_address.length > 0
      ? place.location.formatted_address
      : 'Address unavailable',
  categories: (place.categories ?? []).map((cat) => ({
    name: cat.name ?? 'Restaurant',
    icon: cat.icon ? `${cat.icon.prefix}64${cat.icon.suffix}` : '',
  })),
  distance: place.distance ?? null,
  location:
    place.latitude !== undefined && place.longitude !== undefined
      ? { lat: place.latitude, lng: place.longitude }
      : null,
  link: place.link ?? null,
});

/**
 * Transforms an array of Foursquare places into clean client-facing objects.
 */
export const transformResults = (
  places: FoursquarePlace[],
): TransformedRestaurant[] => {
  return places.map(transformPlace);
};

// ─── Location Resolution ─────────────────────────────────────────────

export type LocationSource = 'near' | 'browser' | 'ip';

type ResolvedLocation = {
  /** The lat,lng string to pass to Foursquare (if near is empty). */
  resolvedLL: string | undefined;
  /** Which tier resolved the location — used for distance labels. */
  locationSource: LocationSource;
  /** Whether the LLM extracted a named location (Tier 1). */
  hasNear: boolean;
};

/**
 * Sanitizes placeholder location strings the LLM sometimes produces.
 * Foursquare can't geocode values like "current location" or "near me",
 * so we clear them to trigger the browser/IP geolocation fallback.
 *
 * @param near - The LLM-extracted location string
 * @returns The original string if valid, or empty string if it was a placeholder
 * @example sanitizePlaceholderNear("Makati City")      // "Makati City"
 * @example sanitizePlaceholderNear("current location") // ""
 */
export const sanitizePlaceholderNear = (near: string): string => {
  if (near.trim().length === 0) return near;
  return PLACEHOLDER_LOCATIONS.includes(near.toLowerCase().trim()) ? '' : near;
};

/**
 * Resolves the user's location through a three-tier priority chain:
 *   1. LLM-extracted `near` text (e.g., "Los Angeles")
 *   2. Browser geolocation `ll` (lat,lng from the frontend)
 *   3. IP-based geolocation via geoip-lite
 *
 * Throws if all three tiers fail and no location can be determined.
 *
 * @param near - The (sanitized) LLM-extracted location string
 * @param ll - Optional lat,lng string from browser geolocation
 * @param clientIp - Optional client IP for geoip fallback
 * @returns The resolved location details for the Foursquare query
 * @throws BadRequestError with reason MISSING_LOCATION if all tiers fail
 */
export const resolveLocation = (
  near: string,
  ll?: string,
  clientIp?: string,
): ResolvedLocation => {
  const hasNear = near.length > 0;
  const hasLL = ll !== null && ll !== undefined && ll.length > 0;

  // Tier 1: LLM-extracted named location
  if (hasNear) {
    return { resolvedLL: ll, locationSource: 'near', hasNear: true };
  }

  // Tier 2: Browser geolocation
  if (hasLL) {
    return { resolvedLL: ll, locationSource: 'browser', hasNear: false };
  }

  // Tier 3: IP-based geolocation
  const ipLL = resolveIpLocation(clientIp);
  if (ipLL) {
    return { resolvedLL: ipLL, locationSource: 'ip', hasNear: false };
  }

  // All tiers exhausted
  throw new BadRequestError(
    'Could not determine a location. Please include a city or area in your search, or allow location access in your browser.',
    { reason: 'MISSING_LOCATION' },
  );
};
