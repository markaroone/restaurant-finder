import { z } from 'zod';

/**
 * Validates the incoming query parameters for GET /api/execute.
 * Used with the `validateRequest` middleware.
 *
 * - `message` is required (the user's search text).
 * - `ll` is optional (lat,lng from browser geolocation — used as location fallback).
 */
export const executeQuerySchema = z.object({
  query: z.object({
    message: z
      .string({
        required_error: 'Message is required',
        invalid_type_error: 'Message must be a string',
      })
      .min(2, 'Message must be at least 2 characters')
      .max(500, 'Message must be 500 characters or fewer'),
    ll: z
      .string()
      .regex(
        /^-?\d+(\.\d+)?,-?\d+(\.\d+)?$/,
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
export const searchParamsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  near: z.string().default(''),
  price: z.number().int().min(1).max(4).nullable().default(null),
  open_now: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).default(10),
  is_food_related: z.boolean().default(true),
});

export type ExecuteQueryInput = z.infer<typeof executeQuerySchema>;
export type SearchParamsInput = z.infer<typeof searchParamsSchema>;
