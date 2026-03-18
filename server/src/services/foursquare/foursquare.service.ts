import ky, { HTTPError } from 'ky';

import {
  AmbiguousLocationError,
  UpstreamError,
} from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import { env } from '@/config/env';
import { SearchParams } from '@/modules/execute/execute.types';
import { DEFAULT_RESULT_LIMIT } from '@/services/llm/llm.constants';

const API_VERSION = '2025-06-17';

/**
 * Root "Food" category ID in the Foursquare Places API (2025-06-17) hex taxonomy.
 * Covers all restaurant subcategories (Japanese, Italian, BBQ, Bakery, etc.).
 * Passing this ensures searches never return grocery stores, hotels, or landmarks.
 * Source: https://docs.foursquare.com/fsq-developers-places/reference/place-search
 */
const FOOD_CATEGORY_ID = '4d4b7105d754a06374d81259';

/**
 * Fields to request from Foursquare.
 * We only request what we need — reduces response size and improves performance.
 *
 * NOTE: Fields like `rating`, `price`, `hours`, `photos` are "Places Premium"
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
 * Foursquare error text when the `near` param cannot be geocoded to a bounding box.
 * Common for local abbreviations ("BGC") or ambiguous district names.
 */
const NEAR_BOUNDARY_ERROR = 'Boundaries could not be determined for near param';

/**
 * Typed query params for Foursquare Place Search API.
 * Uses native types — ky's `searchParams` auto-converts via URLSearchParams.
 */
type FoursquareQueryParams = {
  query: string;
  limit: number;
  sort: string;
  fields: string;
  fsq_category_ids: string;
  min_price?: number;
  max_price?: number;
  near?: string;
  ll?: string;
  open_now?: boolean;
};

/**
 * Builds the search params from our internal SearchParams.
 * Uses `near` (text location) if available, otherwise falls back to `ll` (lat,lng coordinates).
 */
const buildSearchParams = (
  params: SearchParams,
  ll?: string,
): FoursquareQueryParams => {
  const queryParams: FoursquareQueryParams = {
    query: params.query,
    limit: DEFAULT_RESULT_LIMIT,
    sort: 'RELEVANCE',
    fields: REQUESTED_FIELDS,
    fsq_category_ids: FOOD_CATEGORY_ID,
  };

  if (params.min_price !== null) queryParams.min_price = params.min_price;
  if (params.max_price !== null) queryParams.max_price = params.max_price;

  // Priority: LLM-extracted "near" > browser geolocation "ll"
  if (params.near.length > 0) {
    queryParams.near = params.near;
  } else if (ll !== undefined) {
    queryParams.ll = ll;
  }

  if (params.open_now) queryParams.open_now = true;

  return queryParams;
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
    if (!(error instanceof HTTPError)) throw error;

    const errorBody = await error.response.text().catch(() => '');

    // Detect the specific Foursquare 400 for unresolvable `near` text.
    // Throw AmbiguousLocationError so the frontend can prompt the user
    // to add a city or country to their search.
    if (
      error.response.status === 400 &&
      errorBody.includes(NEAR_BOUNDARY_ERROR)
    ) {
      logger.warn(
        { near: searchParams.near },
        '⚠️  Foursquare could not geocode near param — throwing AMBIGUOUS_LOCATION',
      );
      throw new AmbiguousLocationError(searchParams.near);
    }

    logger.error(
      { status: error.response.status, body: errorBody },
      '❌ Foursquare API error',
    );

    // Only include raw upstream error details in development (ADR-011).
    const meta =
      env.NODE_ENV === 'development'
        ? { foursquareStatus: error.response.status, foursquareBody: errorBody }
        : { foursquareStatus: error.response.status };

    throw new UpstreamError(
      `Restaurant search service returned an error (${error.response.status})`,
      meta,
    );
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
