import {
  AmbiguousLocationError,
  BadRequestError,
} from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import { ExecuteResponse, SearchParams } from '@/modules/execute/execute.types';
import {
  buildDistanceLabel,
  resolveCountryFromIp,
  resolveLocation,
  sanitizePlaceholderNear,
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
  // ─── Step 1: Injection Pre-screen + LLM Parsing ──────────────────────
  detectInjection(message);

  let searchParams: SearchParams;
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

  logger.info({ searchParams }, '🔍 Search parameters');

  // Sanitize placeholder locations the LLM sometimes produces
  // (e.g., "near me" → near: "current location"). Foursquare can't resolve these.
  searchParams.near = sanitizePlaceholderNear(searchParams.near);

  // ─── Step 2: Location Resolution (three-tier priority chain) ─────────
  const { resolvedLL, locationSource, hasNear } = resolveLocation(
    searchParams.near,
    ll,
    clientIp,
  );

  // ─── Step 3: Foursquare Search ───────────────────────────────────────
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

  // ─── Step 4: Transform + Response ────────────────────────────────────
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
