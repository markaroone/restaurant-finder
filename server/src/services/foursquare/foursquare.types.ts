/**
 * Complete Foursquare Places API Types — v2025-06-17
 *
 * Reference file containing the full Pro + Premium response types.
 * Source: Foursquare AI chatbot + migration guide + manual testing.
 *
 * IMPORTANT: Not all fields are available on the freePro tier.
 * See `foursquare.service.ts` for the subset we actually request.
 *
 * Key changes from older API versions:
 * - `fsq_id` → `fsq_place_id`
 * - `geocodes.main.latitude/longitude` → top-level `latitude`/`longitude`
 * - `features` → `attributes`
 * - `location.dma/census_block` → `extended_location.dma/census_block`
 * - Removed: `timezone`, `closed_bucket`, `fax`, `verified`
 * - `categories[].id` is now a BSON hex string (was integer)
 *
 * Required header: X-Places-Api-Version: 2025-06-17
 */

// ─── Shared / Nested Types ──────────────────────────────────────────────────

export type FSQCategoryIcon = {
  id: string;
  created_at: string;
  prefix: string;
  suffix: string;
  width: number;
  height: number;
  classifications: string[];
};

/** Foursquare category with BSON hex ID (e.g. "4bf58dd8d48988d1d2941735") */
export type FSQCategory = {
  id: string;
  name: string;
  icon: FSQCategoryIcon;
};

export type FSQChain = {
  id: string;
  name: string;
};

export type FSQLocation = {
  address?: string;
  locality?: string;
  region?: string;
  postcode?: string;
  country?: string;
  admin_region?: string;
  post_town?: string;
  po_box?: string;
};

export type FSQExtendedLocation = {
  dma?: string;
  census_block?: string;
};

export type FSQSocialMedia = {
  facebook_id?: string;
  instagram?: string;
  twitter?: string;
};

export type FSQRelatedPlaces = {
  parent?: {
    fsq_place_id: string;
    name: string;
  };
  children?: {
    fsq_place_id?: string;
    name: string;
  }[];
};

export type FSQHoursRegular = {
  /** 1 = Monday ... 7 = Sunday */
  day: number;
  open: string;
  close: string;
};

export type FSQHours = {
  regular: FSQHoursRegular[];
  is_local_holiday: boolean;
  open_now: boolean;
  display: string;
};

export type FSQPhoto = {
  id: string;
  created_at: string;
  classifications: string[];
  prefix: string;
  suffix: string;
  width: number;
  height: number;
};

export type FSQTip = {
  created_at: string;
  text: string;
};

export type FSQStats = {
  total_photos: number;
  total_ratings: number;
  total_tips: number;
};

export type FSQPlaceAction = {
  action_type: string;
  url: string;
  provider_source_id: string;
};

export type FSQUnresolvedFlag =
  | 'closed'
  | 'duplicate'
  | 'delete'
  | 'privatevenue'
  | 'inappropriate'
  | 'doesnt_exist';

// ─── Places Pro Response ─────────────────────────────────────────────────────
// These fields are included with Places Pro access.
// NOTE: On the freePro tier, some Pro fields (tel, email, website,
// social_media) return 429. Only a subset is available for free.

/**
 * Foursquare Places Pro response shape.
 * Contains all fields available under the Pro tier.
 * On the freePro (free) tier, `tel`, `email`, `website`, and
 * `social_media` return 429 despite being listed as Pro fields.
 */
export type FSQPlaceProResponse = {
  fsq_place_id: string;
  name: string;
  categories: FSQCategory[];
  location: FSQLocation;
  latitude: number;
  longitude: number;
  /** Only returned by Place Search endpoint, not Place Details */
  distance?: number;
  tel?: string;
  email?: string;
  website?: string;
  social_media?: FSQSocialMedia;
  link: string;
  date_closed?: string;
  placemaker_url?: string;
  chains: FSQChain[];
  store_id?: string;
  related_places?: FSQRelatedPlaces;
  extended_location?: FSQExtendedLocation;
  unresolved_flags?: FSQUnresolvedFlag[];
};

// ─── Places Premium Response ─────────────────────────────────────────────────
// Extends Pro with additional fields that require Premium-tier access.
// All of these return 429 on the freePro tier.

/**
 * Foursquare Places Premium response shape.
 * Extends Pro with additional fields requiring Premium-tier access.
 * All Premium fields return 429 on the freePro (free) tier.
 */
export type FSQPlacePremiumResponse = FSQPlaceProResponse & {
  /** Boolean tags (e.g., takes_reservations, outdoor_seating) */
  attributes?: Record<string, unknown>;
  description?: string;
  hours?: FSQHours;
  hours_popular?: FSQHoursRegular[];
  menu?: string;
  photos?: FSQPhoto[];
  place_actions?: FSQPlaceAction[];
  /** Popularity score: 0 to 1 */
  popularity?: number;
  /** Price level: 1 = cheap, 4 = very expensive */
  price?: 1 | 2 | 3 | 4;
  /** Rating: 0.0 to 10.0 */
  rating?: number;
  stats?: FSQStats;
  tastes?: string[];
  tips?: FSQTip[];
  /** Veracity rating: 1 to 5 */
  veracity_rating?: 1 | 2 | 3 | 4 | 5;
};

// ─── Search Response Wrapper ─────────────────────────────────────────────────

/** Top-level response from the Foursquare Place Search endpoint. */
export type FSQSearchResponse = {
  results: FSQPlaceProResponse[];
  context: {
    geo_bounds: {
      circle: {
        center: {
          latitude: number;
          longitude: number;
        };
        radius: number;
      };
    };
  };
};
