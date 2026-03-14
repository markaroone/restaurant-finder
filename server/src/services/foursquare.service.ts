import ky, { HTTPError } from 'ky';

import { env } from '@/config/env';
import { SearchParams } from '@/modules/execute/execute.types';
import { UpstreamError } from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';

const API_VERSION = '2025-06-17';

/**
 * NOTE: The 2025 Foursquare API uses hex-format category IDs
 * (e.g., "4bf58dd8d48988d1d2941735"), not the old numeric format ("13065").
 * Since the LLM query param (e.g., "sushi", "Italian") already constrains
 * results to food venues, we do not filter by category ID.
 */

/**
 * Fields to request from Foursquare.
 * We only request what we need — reduces response size and improves performance.
 *
 * NOTE: Fields like `rating`, `price`, `hours`, `photos` are "Places Premium"
 * and require paid API credits. Per the challenge spec: "If a field requires
 * premium access, you may skip it." We request only free-tier fields.
 */
const REQUESTED_FIELDS = [
  'fsq_place_id',
  'name',
  'location',
  'categories',
  'distance',
  'link',
  'latitude',
  'longitude',
].join(',');

/**
 * Pre-configured ky instance for Foursquare API calls.
 * Sets the base URL, auth header, and API version header.
 */
const foursquareApi = ky.create({
  prefixUrl: 'https://places-api.foursquare.com/places',
  headers: {
    Authorization: `Bearer ${env.FOURSQUARE_API_KEY}`,
    'X-Places-Api-Version': API_VERSION,
    Accept: 'application/json',
  },
});

/**
 * Builds the search params record from our internal SearchParams.
 * Uses `near` (text location) if available, otherwise falls back to `ll` (lat,lng coordinates).
 */
const buildSearchParams = (
  params: SearchParams,
  ll?: string,
): Record<string, string> => {
  const searchParams: Record<string, string> = {
    query: params.query,
    limit: String(params.limit),
    sort: 'RELEVANCE',
    fields: REQUESTED_FIELDS,
  };

  // Priority: LLM-extracted "near" > browser geolocation "ll"
  if (params.near.length > 0) {
    searchParams.near = params.near;
  } else if (ll != null) {
    searchParams.ll = ll;
  }

  // NOTE: min_price/max_price filters are premium-only on free tier.
  // We skip them to avoid 429 errors. The LLM still extracts price
  // preference for potential frontend usage or future premium upgrade.

  if (params.open_now) {
    searchParams.open_now = 'true';
  }

  return searchParams;
};

/**
 * Searches for restaurants using the Foursquare Places API.
 *
 * @param searchParams - Validated search parameters from the LLM
 * @param ll - Optional lat,lng string (browser geolocation fallback)
 * @returns Raw Foursquare results array
 * @throws UpstreamError if the Foursquare API returns an error
 */
export const searchRestaurants = async (
  searchParams: SearchParams,
  ll?: string,
): Promise<FoursquarePlace[]> => {
  const queryParams = buildSearchParams(searchParams, ll);

  logger.info({ searchParams, ll }, '🔍 Querying Foursquare Places API');

  try {
    const data = await foursquareApi
      .get('search', { searchParams: queryParams })
      .json<FoursquareSearchResponse>();

    logger.info(
      { resultCount: data.results?.length ?? 0 },
      '✅ Foursquare returned results',
    );

    return data.results ?? [];
  } catch (error) {
    if (error instanceof HTTPError) {
      const errorBody = await error.response
        .text()
        .catch(() => 'Unknown error');
      logger.error(
        { status: error.response.status, body: errorBody },
        '❌ Foursquare API error',
      );

      // Only include raw upstream error details in development.
      // Production responses omit internal API details to prevent info leakage.
      const meta =
        env.NODE_ENV === 'development'
          ? {
              foursquareStatus: error.response.status,
              foursquareBody: errorBody,
            }
          : { foursquareStatus: error.response.status };

      throw new UpstreamError(
        `Restaurant search service returned an error (${error.response.status})`,
        meta,
      );
    }
    throw error;
  }
};

// ─── Foursquare API Response Types ───────────────────────────────────────────

/**
 * Raw Foursquare place object from the API response (2025-06-17 version).
 * Only includes free-tier fields we request via the `fields` parameter.
 *
 * Source: Foursquare AI chatbot + manual API testing.
 * Key differences from older API versions:
 * - `geocodes` replaced by top-level `latitude`/`longitude`
 * - `fsq_category_id` is a BSON hex string (not a number)
 * - Premium fields (rating, price, hours, etc.) omitted — return 429 on free tier
 */
export type FoursquarePlace = {
  fsq_place_id?: string;
  name?: string;
  location?: {
    address?: string;
    locality?: string;
    region?: string;
    postcode?: string;
    country?: string;
    formatted_address?: string;
  };
  categories?: {
    fsq_category_id?: string;
    name?: string;
    short_name?: string;
    icon?: {
      prefix?: string;
      suffix?: string;
    };
  }[];
  distance?: number;
  link?: string;
  latitude?: number;
  longitude?: number;
};

type FoursquareSearchResponse = {
  results?: FoursquarePlace[];
};
