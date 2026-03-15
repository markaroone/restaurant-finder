import geoip from 'geoip-lite';

import {
  AmbiguousLocationError,
  BadRequestError,
} from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import {
  ExecuteResponse,
  TransformedRestaurant,
} from '@/modules/execute/execute.types';
import { FoursquarePlace, searchRestaurants } from '@/services/foursquare';
import {
  detectInjection,
  parseMessage,
  parseMessageHeuristic,
} from '@/services/llm';

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
  if (geo?.ll && geo.city) {
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
 * Placeholder location strings the LLM sometimes produces
 * (e.g., "near me" → near: "current location"). Foursquare can't resolve these,
 * so they are stripped to trigger the browser/IP geolocation fallback.
 */
const PLACEHOLDER_LOCATIONS = [
  'current location',
  'near me',
  'my location',
  'my area',
  'nearby',
  'here',
]; /**
 * Maps ISO 3166-1 alpha-2 country codes to full English country names.
 * Covers the most common countries; falls back to the raw code for unlisted entries.
 */
const ISO_COUNTRY_NAMES: Record<string, string> = {
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
};

/**
 * Resolves the country name from the client's IP via geoip-lite.
 * Used to enrich AMBIGUOUS_LOCATION suggestions with "[near], [country]".
 * Returns null if the lookup fails or the IP is private.
 */
const resolveCountryFromIp = (ip?: string): string | null => {
  if (!ip) return null;
  const cleanIp = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (
    cleanIp === '127.0.0.1' ||
    cleanIp === '::1' ||
    cleanIp.startsWith('192.168.') ||
    cleanIp.startsWith('10.')
  )
    return null;

  const geo = geoip.lookup(cleanIp);
  if (!geo?.country) return null;

  return ISO_COUNTRY_NAMES[geo.country] ?? geo.country;
};

type LocationSource = 'near' | 'browser' | 'ip' | null;

/**
 * Builds a human-readable distance suffix based on which location tier resolved.
 * e.g., "away from Makati City", "away from you", "away from you (approx.)"
 */
const buildDistanceLabel = (source: LocationSource, near: string): string => {
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

/**
 * Main search pipeline: LLM parsing → location resolution → Foursquare search → transform.
 *
 * Location priority chain:
 * 1. LLM-extracted `near` (e.g., "Los Angeles")
 * 2. Browser geolocation `ll` (lat,lng from the frontend)
 * 3. IP-based geolocation via geoip-lite
 * 4. Throws MISSING_LOCATION if all tiers fail
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
  // Step 1: Injection pre-screen + LLM parsing (with heuristic fallback)
  detectInjection(message);

  let searchParams: Awaited<ReturnType<typeof parseMessage>>;
  let parsedBy: 'llm' | 'heuristic' = 'llm';

  try {
    searchParams = await parseMessage(message);
  } catch (error) {
    // Only fall back on upstream errors (Gemini unavailable/timeout).
    // BadRequestErrors (injection, bad input) are re-thrown immediately.
    if (error instanceof BadRequestError) throw error;

    logger.warn(
      { error },
      '⚡ Gemini unavailable — falling back to heuristic parser',
    );
    searchParams = await parseMessageHeuristic(message);
    parsedBy = 'heuristic';
  }

  // Sanitize placeholder locations the LLM sometimes produces
  // (e.g., "near me" → near: "current location"). Foursquare can't resolve these.
  if (PLACEHOLDER_LOCATIONS.includes(searchParams.near.toLowerCase().trim())) {
    searchParams.near = '';
  }

  // Step 2: Resolve location — priority chain
  const hasNear = searchParams.near.length > 0;
  const hasLL = ll != null && ll.length > 0;

  // Track which tier resolved the location for the distance label
  let locationSource: LocationSource = null;

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

  const hasFallbackLL =
    resolvedLL !== null && resolvedLL !== undefined && resolvedLL.length > 0;

  if (!hasNear && !hasFallbackLL) {
    throw new BadRequestError(
      'Could not determine a location. Please include a city or area in your search, or allow location access in your browser.',
      { reason: 'MISSING_LOCATION' },
    );
  }

  // Step 3: Foursquare search — pass ll as fallback when near is empty
  let rawResults;
  try {
    rawResults = await searchRestaurants(
      searchParams,
      hasNear ? undefined : resolvedLL,
    );
  } catch (error) {
    // Enrich AMBIGUOUS_LOCATION with geoip suggestion before re-throwing.
    // The suggestion helps the frontend render "Did you mean: [near], [country]?"
    if (error instanceof AmbiguousLocationError) {
      const country = resolveCountryFromIp(clientIp);
      const suggestion =
        country != null
          ? `${searchParams.near}, ${country}`
          : searchParams.near;
      logger.warn(
        { near: searchParams.near, suggestion },
        '🗺️  Rethrowing AMBIGUOUS_LOCATION with geoip suggestion',
      );
      throw new AmbiguousLocationError(searchParams.near, suggestion, {
        query: searchParams.query,
      });
    }
    throw error;
  }

  // Step 4: Transform
  const results = transformResults(rawResults);

  const distanceLabel = buildDistanceLabel(locationSource, searchParams.near);

  return {
    results,
    searchParams,
    meta: {
      resultCount: results.length,
      searchedAt: new Date().toISOString(),
      distanceLabel,
      parsedBy,
    },
  };
};
