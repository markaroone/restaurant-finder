import { z } from 'zod';

import { normalizeConfusables, sanitizeUnicode } from '@/common/utils/sanitize';

/**
 * Validates the incoming query parameters for GET /api/execute.
 * Used with the `validateRequest` middleware.
 *
 * - `message` is required (the user's search text).
 * - `ll` is optional (lat,lng from browser geolocation — used as location fallback).
 *
 * Sanitization pipeline (via Zod transforms):
 *   1. .max(500)                  — reject oversized payloads (on raw input)
 *   2. .transform(normalizeConfusables) — homoglyphs → ASCII (Cyrillic "і" → "i")
 *   3. .transform(sanitizeUnicode)      — strip Zalgo, zero-width, null bytes
 *   4. .pipe(.min(2))             — reject inputs that became empty after sanitization
 *
 * The `validateRequest` middleware writes the transformed value back to
 * `req.query` via `Object.defineProperty`, so downstream code sees clean text.
 */
export const executeQuerySchema = z.object({
  query: z.object({
    message: z
      .string({
        required_error: 'Message is required',
        invalid_type_error: 'Message must be a string',
      })
      .max(500, 'Message must be 500 characters or fewer')
      .transform(normalizeConfusables)
      .transform(sanitizeUnicode)
      .pipe(z.string().min(2, 'Message must be at least 2 characters')),
    ll: z
      .string()
      .max(40, 'll value too long')
      .regex(
        /^-?\d{1,3}(\.\d{1,15})?,-?\d{1,3}(\.\d{1,15})?$/,
        'll must be in the format "lat,lng" (e.g., "14.55,121.02")',
      )
      .optional(),
  }),
});

/**
 * Validates the structured search parameters returned by the LLM.
 * This acts as the second defense layer after Gemini's structured output.
 *
 * `near` is now optional — when empty, the backend falls back to `ll`
 * coordinates from the user's browser geolocation.
 */
export const searchParamsSchema = z
  .object({
    query: z.string().min(1, 'Search query is required'),
    near: z.string().default(''),
    min_price: z.number().int().min(1).max(4).nullable().default(null),
    max_price: z.number().int().min(1).max(4).nullable().default(null),
    open_now: z.boolean().default(false),
    is_food_related: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.min_price !== null && data.max_price !== null) {
        return data.min_price <= data.max_price;
      }
      return true;
    },
    { message: 'min_price must be less than or equal to max_price' },
  );

export type ExecuteQueryInput = z.infer<typeof executeQuerySchema>;
export type SearchParamsInput = z.infer<typeof searchParamsSchema>;
