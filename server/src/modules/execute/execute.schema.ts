import { z } from 'zod';

/**
 * Validates the incoming query parameters for GET /api/execute.
 * Used with the `validateRequest` middleware.
 */
export const executeQuerySchema = z.object({
  query: z.object({
    message: z
      .string({
        required_error: 'Message is required',
        invalid_type_error: 'Message must be a string',
      })
      .min(1, 'Message cannot be empty')
      .max(500, 'Message must be 500 characters or fewer'),
  }),
});

/**
 * Validates the structured search parameters returned by the LLM.
 * This acts as the second defense layer after Gemini's structured output.
 */
export const searchParamsSchema = z.object({
  query: z.string().min(1, 'Search query is required'),
  near: z.string().min(1, 'Location is required'),
  price: z.number().int().min(1).max(4).nullable().default(null),
  open_now: z.boolean().default(false),
  limit: z.number().int().min(1).max(50).default(10),
});

export type ExecuteQueryInput = z.infer<typeof executeQuerySchema>;
export type SearchParamsInput = z.infer<typeof searchParamsSchema>;
