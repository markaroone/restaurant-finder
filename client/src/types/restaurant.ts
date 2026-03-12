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
  price: number | null;
  rating: number | null;
  distance: number | null;
  hours: { openNow: boolean; display: string } | null;
  location: RestaurantLocation | null;
  link: string | null;
};

export type SearchParams = {
  query: string;
  near: string;
  price: number | null;
  open_now: boolean;
  limit: number;
};

export type ExecuteResponse = {
  results: Restaurant[];
  searchParams: SearchParams;
  meta: {
    resultCount: number;
    searchedAt: string;
    /** Contextual label for distance, e.g. "away from La Union" or "away from you". */
    distanceLabel: string;
  };
};
