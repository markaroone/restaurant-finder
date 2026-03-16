/** Human-readable labels for Foursquare's 1–4 price levels. */
const PRICE_LABELS: Record<number, string> = {
  1: 'Budget',
  2: 'Moderate',
  3: 'Upscale',
  4: 'Fine Dining',
};

/**
 * Derives a human-readable price label from min/max price fields.
 *
 * - Both `null` → returns `null` (no price constraint).
 * - Same value   → single label, e.g. `"Budget"`.
 * - Different    → range label, e.g. `"Budget – Moderate"`.
 * - Only one set → uses whichever is present.
 *
 * @param minPrice - Lower bound of the price range (1–4), or `null`.
 * @param maxPrice - Upper bound of the price range (1–4), or `null`.
 * @returns A display-ready string like `"Budget"` or `"Budget – Moderate"`, or `null` if no price is set.
 *
 * @example
 * formatPriceLabel(1, 1)    // "Budget"
 * formatPriceLabel(1, 2)    // "Budget – Moderate"
 * formatPriceLabel(null, null) // null
 */
export const formatPriceLabel = (
  minPrice: number | null,
  maxPrice: number | null,
): string | null => {
  if (minPrice === null && maxPrice === null) return null;

  if (minPrice !== null && maxPrice !== null && minPrice === maxPrice) {
    return PRICE_LABELS[minPrice] ?? null;
  }

  if (minPrice !== null && maxPrice !== null) {
    const minLabel = PRICE_LABELS[minPrice];
    const maxLabel = PRICE_LABELS[maxPrice];
    if (minLabel && maxLabel) return `${minLabel} – ${maxLabel}`;
  }

  if (minPrice !== null) return PRICE_LABELS[minPrice] ?? null;
  if (maxPrice !== null) return PRICE_LABELS[maxPrice] ?? null;

  return null;
};
