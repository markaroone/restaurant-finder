/**
 * Structured search parameters extracted from the user's message by the LLM.
 */
export type SearchParams = {
  /** Cuisine or restaurant type (e.g., "sushi", "Italian"). */
  query: string;
  /** Location to search (e.g., "downtown Los Angeles"). */
  near: string;
  /** Price level 1-4 (1=cheap, 4=very expensive). Null if not specified. */
  price: number | null;
  /** Whether to filter for currently open places. */
  open_now: boolean;
  /** Number of results to return (1-50). */
  limit: number;
  /** Whether the request is about food/restaurants. */
  is_food_related: boolean;
};

/**
 * A clean restaurant object returned to the client.
 */
export type TransformedRestaurant = {
  id: string;
  name: string;
  address: string;
  categories: { name: string; icon: string }[];
  price: number | null;
  rating: number | null;
  distance: number | null;
  hours: { openNow: boolean; display: string } | null;
  location: { lat: number; lng: number } | null;
  link: string | null;
};

/**
 * The complete response returned by the execute endpoint.
 */
export type ExecuteResponse = {
  results: TransformedRestaurant[];
  searchParams: SearchParams;
  meta: {
    resultCount: number;
    searchedAt: string;
    /** Contextual label for distance, e.g. "away from La Union" or "away from you". */
    distanceLabel: string;
    /** Which parser produced the searchParams. 'llm' = Gemini, 'heuristic' = local NER fallback. */
    parsedBy: 'llm' | 'heuristic';
  };
};
