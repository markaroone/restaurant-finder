/**
 * Restaurant types mirroring the backend TransformedRestaurant.
 * These are the shapes returned by GET /api/execute.
 */

export type RestaurantCategory = {
  name: string;
  icon: string;
};

export type RestaurantLocation = {
  lat: number;
  lng: number;
};

export type Restaurant = {
  id: string;
  name: string;
  address: string;
  categories: RestaurantCategory[];
  distance: number | null;
  location: RestaurantLocation | null;
  link: string | null;
};

export type SearchParams = {
  query: string;
  near: string;
  min_price: number | null;
  max_price: number | null;
  open_now: boolean;
};

export type ExecuteResponse = {
  results: Restaurant[];
  searchParams: SearchParams;
  meta: {
    resultCount: number;
    searchedAt: string;
    /** Which tier resolved the user's location. 'near' = LLM-extracted, 'browser' = geolocation, 'ip' = geoip. */
    locationSource: 'near' | 'browser' | 'ip';
    /** Which parser produced the searchParams. 'llm' = Gemini, 'heuristic' = local NER fallback. */
    parsedBy: 'llm' | 'heuristic';
  };
};
