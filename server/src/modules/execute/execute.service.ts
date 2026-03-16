import {
  AmbiguousLocationError,
  BadRequestError,
} from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import { PLACEHOLDER_LOCATIONS } from '@/modules/execute/execute.constants';
import { ExecuteResponse } from '@/modules/execute/execute.types';
import {
  buildDistanceLabel,
  LocationSource,
  resolveCountryFromIp,
  resolveIpLocation,
  transformResults,
} from '@/modules/execute/execute.util';
import { FoursquarePlace, searchRestaurants } from '@/services/foursquare';
import {
  detectInjection,
  parseMessage,
  parseMessageHeuristic,
} from '@/services/llm';

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
  const hasLL = ll !== null && ll !== undefined && ll.length > 0;

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
  let rawResults: FoursquarePlace[];
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
        country !== null && country !== undefined
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
