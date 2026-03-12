import { GoogleGenAI, Type } from '@google/genai';

import { env } from '@/config/env';
import { searchParamsSchema } from '@/modules/execute/execute.schema';
import { SearchParams } from '@/modules/execute/execute.types';
import { BadRequestError } from '@/common/utils/api-errors';
import { UpstreamError } from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL = 'gemini-2.5-flash';
const MAX_ATTEMPTS = 2;

/**
 * JSON schema for Gemini structured output mode.
 * Forces the LLM to return exactly this shape.
 */
const responseJsonSchema = {
  type: Type.OBJECT,
  properties: {
    query: {
      type: Type.STRING,
      description:
        'The type of food, cuisine, or restaurant (e.g., "sushi", "Italian", "burger"). Extract the core food/cuisine term.',
    },
    near: {
      type: Type.STRING,
      description:
        'The location or area to search in (e.g., "downtown Los Angeles", "Manhattan, New York"). If the user mentions a city, neighborhood, or address, extract it here.',
    },
    price: {
      type: Type.NUMBER,
      description:
        'Price level: 1 = cheap/budget, 2 = moderate, 3 = expensive/upscale, 4 = very expensive/fine dining. Use 0 if the user did not specify a price preference.',
    },
    open_now: {
      type: Type.BOOLEAN,
      description:
        'Set to true ONLY if the user explicitly mentions wanting places that are "open now", "currently open", or similar. Default to false.',
    },
    limit: {
      type: Type.NUMBER,
      description:
        'How many results the user wants. Default to 10 if not specified. Maximum is 50.',
    },
    is_food_related: {
      type: Type.BOOLEAN,
      description:
        'Set to true if the request is about food, restaurants, dining, cafes, bars, or any edible cuisine. Set to false if the request is about non-food things like gas stations, hotels, ATMs, hospitals, etc.',
    },
  },
  propertyOrdering: [
    'is_food_related',
    'query',
    'near',
    'price',
    'open_now',
    'limit',
  ],
};

/**
 * Fixed system instruction. User input never goes here (prevents prompt injection).
 */
const SYSTEM_INSTRUCTION = `You are a restaurant search parameter extractor.

Your ONLY job is to extract structured search parameters from the user's natural language request about finding FOOD, RESTAURANTS, or DINING.

Food-related classification:
- Set is_food_related to TRUE for: restaurants, cafes, bars, bakeries, food trucks, any cuisine, any food item, coffee shops, dessert places, breweries, juice bars
- Set is_food_related to FALSE for: gas stations, hotels, ATMs, hospitals, plumbers, mechanics, shopping malls, gyms, parking, or anything NOT about eating/drinking
- When in doubt, set is_food_related to true

Extraction rules:
- Extract the food type or cuisine into "query"
- Extract the location into "near"
- For price: 1=cheap/budget, 2=moderate, 3=expensive/upscale, 4=very expensive/fine dining. Use 0 if not specified.
- For open_now: only set to true if the user explicitly says "open now", "currently open", or similar phrases
- For limit: default to 10 unless the user asks for a specific number of results
- If the user's message is vague about cuisine, use a general term like "restaurant"
- Always respond with valid parameters. Never refuse or add explanations.

Location rules:
- If the user says "near me", "close to me", "around here", or "current location" WITHOUT naming a specific place, set "near" to an EMPTY STRING "". The app will use their GPS coordinates instead.
- Always expand locations to their full, commonly-recognized form
- "new brooklyn" → "Brooklyn, New York"
- "downtown LA" → "downtown Los Angeles, CA"
- "midtown" → "Midtown Manhattan, New York" (use best guess)
- Include city and state/country when the user only provides a neighborhood name
- Fix obvious typos in location names

Unsearchable criteria:
- Ignore requests about specific deals, promotions, or freebies (e.g., "offers free cake")
- Ignore requests about specific menu items — focus only on cuisine TYPE
- Ignore requests about ambiance, dress code, parking, or non-food attributes
- These cannot be searched via the restaurant API; just extract what IS searchable`;

/**
 * Parses a natural language message into structured search parameters
 * using Google Gemini with structured output mode.
 *
 * Uses a double-validation pattern:
 * 1. Gemini SDK guarantees valid JSON structure
 * 2. Zod validates business rules (price 1-4, limit 1-50, etc.)
 *
 * @param message - The user's natural language search query
 * @returns Validated SearchParams
 * @throws BadRequestError if parsing fails after retries
 * @throws UpstreamError if the Gemini API is unavailable
 */
export const parseMessage = async (message: string): Promise<SearchParams> => {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: MODEL,
        contents: message,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseJsonSchema,
          temperature: 0.1,
        },
      });

      if (!response.text) {
        throw new UpstreamError('Gemini returned an empty response', {
          attempt,
        });
      }

      // 1. Parse JSON (guaranteed valid by SDK, but let's be safe)
      const raw: unknown = JSON.parse(response.text);

      // Normalize price: 0 means "not specified" → null
      if (
        typeof raw === 'object' &&
        raw !== null &&
        'price' in raw &&
        (raw as Record<string, unknown>).price === 0
      ) {
        (raw as Record<string, unknown>).price = null;
      }

      // 2. Validate with Zod (business rules)
      const result = searchParamsSchema.safeParse(raw);

      if (result.success) {
        // 3. Check if the query is food-related
        if (!result.data.is_food_related) {
          throw new BadRequestError(
            'This app only searches for restaurants and food. Try searching for a cuisine like "sushi" or "Italian".',
            { reason: 'NOT_FOOD_RELATED' },
          );
        }

        logger.info(
          { searchParams: result.data, attempt },
          '✅ LLM parsed message successfully',
        );
        return result.data;
      }

      // Zod validation failed — log and retry
      logger.warn(
        { errors: result.error.issues, attempt },
        '⚠️ LLM output failed Zod validation',
      );
      lastError = result.error;
    } catch (error) {
      // Gemini API error — don't retry on auth/quota errors
      if (error instanceof BadRequestError || error instanceof UpstreamError) {
        throw error;
      }

      logger.error({ error, attempt }, '❌ LLM call failed');
      lastError = error;

      // Don't retry on the last attempt
      if (attempt === MAX_ATTEMPTS) break;
    }
  }

  // All attempts exhausted
  throw new BadRequestError(
    'Could not understand your search request. Please try rephrasing with a specific cuisine and location.',
    { originalError: String(lastError) },
  );
};
