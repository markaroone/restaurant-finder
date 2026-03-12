import geoip from 'geoip-lite';

import { parseMessage } from '@/services/llm.service';
import {
  searchRestaurants,
  FoursquarePlace,
} from '@/services/foursquare.service';
import {
  ExecuteResponse,
  TransformedRestaurant,
} from '@/modules/execute/execute.types';
import { BadRequestError } from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';

/**
 * Transforms a raw Foursquare place into our clean client-facing shape.
 * Premium fields (price, rating, hours, geocodes) are not available on the
 * free tier, so they always return null. The types still include them for
 * forward-compatibility if the user upgrades their Foursquare plan.
 */
const transformPlace = (place: FoursquarePlace): TransformedRestaurant => ({
  id: place.fsq_place_id ?? crypto.randomUUID(),
  name: place.name ?? 'Unknown',
  address: place.location?.formatted_address ?? 'Address unavailable',
  categories: (place.categories ?? []).map((cat) => ({
    name: cat.name ?? 'Restaurant',
    icon: cat.icon ? `${cat.icon.prefix}64${cat.icon.suffix}` : '',
  })),
  price: null, // Premium field — not available on free tier
  rating: null, // Premium field — not available on free tier
  distance: place.distance ?? null,
  hours: null, // Premium field — not available on free tier
  location:
    place.latitude != null && place.longitude != null
      ? { lat: place.latitude, lng: place.longitude }
      : null,
  link: place.link ?? null,
});

/**
 * Transforms an array of Foursquare places into clean client-facing objects.
 */
const transformResults = (
  places: FoursquarePlace[],
): TransformedRestaurant[] => {
  return places.map(transformPlace);
};

/**
 * Resolves a lat,lng string from the client's IP address using the local
 * MaxMind GeoLite2 database (geoip-lite). Returns undefined if lookup fails.
 */
const resolveIpLocation = (ip?: string): string | undefined => {
  if (!ip) return undefined;

  // Strip IPv6-mapped prefix (e.g., "::ffff:192.168.1.1" → "192.168.1.1")
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;

  // Skip private/loopback IPs — they won't resolve
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('10.')
  ) {
    logger.debug({ ip: cleanIp }, '⏭️ Skipping geoip for private/loopback IP');
    return undefined;
  }

  const geo = geoip.lookup(cleanIp);
  if (geo?.ll) {
    const [lat, lng] = geo.ll;
    logger.info(
      { ip: cleanIp, city: geo.city, ll: `${lat},${lng}` },
      '📍 Resolved IP to location via geoip-lite',
    );
    return `${lat},${lng}`;
  }

  logger.debug({ ip: cleanIp }, '⚠️ geoip-lite lookup returned no result');
  return undefined;
};

/**
 * Orchestrates the full search pipeline:
 * 1. Parse the user's message with the LLM
 * 2. Determine location using the priority chain:
 *    LLM "near" > browser "ll" > IP geolocation > error
 * 3. Search Foursquare with the resolved location
 * 4. Transform the results into a clean response
 *
 * @param message - The user's natural language search query
 * @param ll - Optional lat,lng string from browser geolocation (fallback)
 * @param clientIp - Optional client IP address for geoip fallback
 * @returns A complete ExecuteResponse with results, searchParams, and meta
 */
export const executeSearch = async (
  message: string,
  ll?: string,
  clientIp?: string,
): Promise<ExecuteResponse> => {
  // Step 1: LLM parsing
  const searchParams = await parseMessage(message);

  // Step 2: Resolve location — priority chain
  const hasNear = searchParams.near.length > 0;
  const hasLL = ll != null && ll.length > 0;

  // Track which tier resolved the location for the distance label
  let locationSource: 'near' | 'browser' | 'ip' | null = null;

  if (hasNear) {
    locationSource = 'near';
  } else if (hasLL) {
    locationSource = 'browser';
  }

  // Tier 3: IP-based geolocation (only if tiers 1 & 2 are empty)
  let resolvedLL = ll;
  if (!hasNear && !hasLL) {
    const ipLL = resolveIpLocation(clientIp);
    if (ipLL) {
      resolvedLL = ipLL;
      locationSource = 'ip';
    }
  }

  const hasFallbackLL = resolvedLL != null && resolvedLL.length > 0;

  if (!hasNear && !hasFallbackLL) {
    throw new BadRequestError(
      'Could not determine a location. Please include a city or area in your search, or allow location access in your browser.',
      { reason: 'MISSING_LOCATION' },
    );
  }

  // Step 3: Foursquare search — pass ll as fallback when near is empty
  const rawResults = await searchRestaurants(
    searchParams,
    hasNear ? undefined : resolvedLL,
  );

  // Step 4: Transform
  const results = transformResults(rawResults);

  // Step 5: Build distance label based on which tier resolved the location
  let distanceLabel = 'away';
  if (locationSource === 'near') {
    distanceLabel = `away from ${searchParams.near}`;
  } else if (locationSource === 'browser') {
    distanceLabel = 'away from you';
  } else if (locationSource === 'ip') {
    distanceLabel = 'away from you (approx.)';
  }

  return {
    results,
    searchParams,
    meta: {
      resultCount: results.length,
      searchedAt: new Date().toISOString(),
      distanceLabel,
    },
  };
};
