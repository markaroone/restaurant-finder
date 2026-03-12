import { parseMessage } from '@/services/llm.service';
import {
  searchRestaurants,
  FoursquarePlace,
} from '@/services/foursquare.service';
import {
  ExecuteResponse,
  TransformedRestaurant,
} from '@/modules/execute/execute.types';

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
 * Orchestrates the full search pipeline:
 * 1. Parse the user's message with the LLM
 * 2. Search Foursquare with the parsed parameters
 * 3. Transform the results into a clean response
 *
 * @param message - The user's natural language search query
 * @returns A complete ExecuteResponse with results, searchParams, and meta
 */
export const executeSearch = async (
  message: string,
): Promise<ExecuteResponse> => {
  // Step 1: LLM parsing
  const searchParams = await parseMessage(message);

  // Step 2: Foursquare search
  const rawResults = await searchRestaurants(searchParams);

  // Step 3: Transform
  const results = transformResults(rawResults);

  return {
    results,
    searchParams,
    meta: {
      resultCount: results.length,
      searchedAt: new Date().toISOString(),
    },
  };
};
