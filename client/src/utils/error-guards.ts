import { ApiError } from './api-error';

/**
 * Internal helper — checks if the error is an {@link ApiError} matching a specific error code.
 * Narrows the type so `.meta`, `.status`, etc. are accessible without casting.
 *
 * @param error - The caught error to inspect.
 * @param code  - The backend error code to match against (e.g. `'AMBIGUOUS_LOCATION'`).
 * @returns `true` if `error` is an {@link ApiError} whose `.code` equals `code`.
 */
const isApiErrorWithCode = (error: Error, code: string): error is ApiError =>
  error instanceof ApiError && error.code === code;

/**
 * Checks whether the error indicates an ambiguous or unresolvable location.
 *
 * Foursquare could not geocode the user's `near` text.
 * When `true`, `error.meta` contains:
 * - `near` — the original location string (e.g. `"xyztown"`)
 * - `suggestion` — a geoip-enriched alternative (e.g. `"xyztown, Philippines"`)
 * - `query` — the food/cuisine portion of the search (e.g. `"pizza"`)
 *
 * @param error - The caught error to inspect.
 * @returns `true` if the error is an `AMBIGUOUS_LOCATION` {@link ApiError}.
 *
 * @example
 * if (isAmbiguousLocationError(error)) {
 *   console.log(error.meta?.suggestion); // "xyztown, Philippines"
 * }
 */
export const isAmbiguousLocationError = (error: Error): error is ApiError =>
  isApiErrorWithCode(error, 'AMBIGUOUS_LOCATION');

/**
 * Checks whether the error indicates a missing location.
 *
 * No `near` text was provided in the query **and** browser geolocation
 * is unavailable or was denied, so the backend has no way to scope the search.
 *
 * @param error - The caught error to inspect.
 * @returns `true` if the error is a `MISSING_LOCATION` {@link ApiError}.
 */
export const isMissingLocationError = (error: Error): error is ApiError =>
  isApiErrorWithCode(error, 'MISSING_LOCATION');

/**
 * Checks whether the error indicates the query is unrelated to food.
 *
 * The LLM (or heuristic parser) determined that the user's message
 * is not about restaurants or food, so no Foursquare search was performed.
 *
 * @param error - The caught error to inspect.
 * @returns `true` if the error is a `NOT_FOOD_RELATED` {@link ApiError}.
 */
export const isNotFoodRelatedError = (error: Error): error is ApiError =>
  isApiErrorWithCode(error, 'NOT_FOOD_RELATED');

/**
 * Checks whether the error is any 400-level (Bad Request) API error.
 *
 * Use this as a catch-all **after** the more specific guards above
 * to display a generic "rephrase your query" hint.
 *
 * @param error - The caught error to inspect.
 * @returns `true` if the error is an {@link ApiError} with HTTP status 400.
 */
export const isBadRequestError = (error: Error): error is ApiError =>
  error instanceof ApiError && error.status === 400;
