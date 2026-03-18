import { BadRequestError } from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import { ExecuteResponse, SearchParams } from '@/modules/execute/execute.types';
import {
  resolveLocation,
  sanitizePlaceholderNear,
  transformResults,
} from '@/modules/execute/execute.util';
import { searchRestaurants } from '@/services/foursquare';
import { parseMessage, parseMessageHeuristic } from '@/services/llm';

/**
 * Main search pipeline: LLM parsing → location resolution → Foursquare search → transform.
 *
 * Location priority chain:
 * 1. LLM-extracted `near` (e.g., "Los Angeles")
 * 2. Browser geolocation `ll` (lat,lng from the frontend)
 * 3. IP-based geolocation via geoip-lite
 * 4. Throws MISSING_LOCATION if all tiers fail
 *
 * Note: Input sanitization and injection detection are handled by middleware
 * in the route chain (Zod transforms + injectionGuard) before this runs.
 *
 * @param message - The user's natural language search query (pre-sanitized)
 * @param ll - Optional lat,lng string from browser geolocation (fallback)
 * @param clientIp - Optional client IP address for geoip fallback
 * @returns A complete ExecuteResponse with results, searchParams, and meta
 */
export const executeSearch = async (
  message: string,
  ll?: string,
  clientIp?: string,
): Promise<ExecuteResponse> => {
  // ─── Step 1: LLM Parsing ─────────────────────────────────────────────

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
  const rawResults = await searchRestaurants(
    searchParams,
    hasNear ? undefined : resolvedLL,
  );

  // ─── Step 4: Transform + Response ────────────────────────────────────
  const results = transformResults(rawResults);

  return {
    results,
    searchParams,
    meta: {
      resultCount: results.length,
      searchedAt: new Date().toISOString(),
      locationSource,
      parsedBy,
    },
  };
};
