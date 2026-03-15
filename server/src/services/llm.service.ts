import { GoogleGenAI, Type } from '@google/genai';

import { BadRequestError, UpstreamError } from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import { sanitizeUnicode } from '@/common/utils/sanitize';
import { env } from '@/config/env';
import { searchParamsSchema } from '@/modules/execute/execute.schema';
import { SearchParams } from '@/modules/execute/execute.types';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL = 'gemini-2.5-flash';
const MAX_ATTEMPTS = 2;
const LLM_TIMEOUT_MS = 15_000; // 15s — generous for Flash (typical: 200-800ms)

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
        'How many results the user wants. Default to 20 if not specified. Maximum is 50.',
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
- Always extract the query in English, even if the user's message is in another language (e.g., "拉面" → "ramen", "寿司" → "sushi", "boulangerie" → "bakery")
- For price: 1=cheap/budget, 2=moderate, 3=expensive/upscale, 4=very expensive/fine dining. Use 0 if not specified.
- For price negations, infer the intended range: "not expensive" → price: 1 or 2, "not cheap" → price: 3 or 4
- For query negations like "anything but sushi", extract a general term like "restaurant"
- For open_now: only set to true if the user explicitly says "open now", "currently open", "rn", "right now", "still open", "open rn", "open late", or similar urgency/availability phrases
- For limit: default to 20 unless the user asks for a specific number of results
- If the user's message is vague about cuisine, use a general term like "restaurant"
- Always respond with valid parameters. Never refuse or add explanations.

Emoji handling:
- Translate food emojis to their English names (e.g., 🍣 → "sushi", 🍕 → "pizza", 🌮 → "tacos", 🍜 → "noodles", ☕ → "coffee")
- Translate location emojis to their most common association (e.g., 🗽 → "New York", 🗼 → "Paris")
- Ignore non-semantic emojis that don't map to a specific food or location
- Do NOT interpret emoji quantity as price level (e.g., 💰💰💰 does not mean price: 3)

Location rules:
- If the user says "near me", "close to me", "around here", or "current location" WITHOUT naming a specific place, set "near" to an EMPTY STRING "". The app will use their GPS coordinates instead.
- Always expand locations to their full, commonly-recognized English form
- Always translate locations to English (e.g., "東京都" → "Tokyo, Japan", "Москве" → "Moscow, Russia", "la torre eiffel" → "Eiffel Tower, Paris, France")
- Expand common abbreviations: "dtla" → "Downtown Los Angeles, CA", "k-town" → "Koreatown, Los Angeles, CA"
- "new brooklyn" → "Brooklyn, New York"
- "downtown LA" → "downtown Los Angeles, CA"
- "midtown" → "Midtown Manhattan, New York" (use best guess)
- Include city and state/country when the user only provides a neighborhood name
- Fix obvious typos in location names
- For mixed-language queries, extract food and location separately and translate each to English

Handling contradictions:
- If the user provides contradictory price signals (e.g., "expensive but cheap"), default to price: 0 (unspecified)
- If the user provides contradictory open/closed signals, default to open_now: false
- Treat sarcasm as a literal query — do not try to infer the user's "real" intent

Unsearchable criteria:
- Ignore requests about specific deals, promotions, or freebies (e.g., "offers free cake")
- Ignore requests about specific menu items — focus only on cuisine TYPE
- Ignore requests about ambiance, dress code, parking, quality ratings (e.g., "best", "worst"), or non-food attributes
- These cannot be searched via the restaurant API; just extract what IS searchable`;

// ─── Validation Stage 1: Input Sanitization ──────────────────────────────────

/**
 * Strips adversarial unicode characters and enforces a minimum length.
 * This is the first line of defense before the input ever reaches the LLM.
 *
 * @throws BadRequestError if the sanitized input is too short to be meaningful
 */
const sanitizeInput = (message: string): string => {
  const sanitized = sanitizeUnicode(message);

  if (sanitized.length < 2) {
    throw new BadRequestError(
      "Your message doesn't contain enough readable text. Please try again with a food or restaurant query.",
    );
  }

  return sanitized;
};

// ─── Validation Stage 2: LLM Structured Output ───────────────────────────────

/**
 * Calls the Gemini API with a strict JSON schema, enforcing structured output.
 * The SDK guarantees the response matches the schema shape; a timeout aborts
 * long-running calls to avoid indefinite hangs.
 *
 * @throws UpstreamError if Gemini returns an empty response or times out
 */
const callLlm = async (
  sanitized: string,
  attempt: number,
): Promise<unknown> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);

  let response;
  try {
    response = await ai.models.generateContent({
      model: MODEL,
      contents: sanitized,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseJsonSchema,
        temperature: 0.1,
        abortSignal: controller.signal,
      },
    });
  } finally {
    clearTimeout(timer);
  }

  if (!response.text) {
    throw new UpstreamError('Gemini returned an empty response', { attempt });
  }

  // SDK guarantees valid JSON structure, but we parse defensively
  return JSON.parse(response.text);
};

// ─── Validation Stage 3: Business Rule Validation ────────────────────────────

/**
 * Normalizes the raw LLM output and validates it against the Zod schema.
 * Also enforces the food-relatedness guard as a semantic business rule.
 *
 * Returns `null` if Zod validation fails (so the caller can retry),
 * or throws BadRequestError immediately for non-retryable semantic failures.
 */
const validateAndNormalize = (
  raw: unknown,
  attempt: number,
): SearchParams | null => {
  // Normalize price: 0 means "not specified" → null
  if (
    typeof raw === 'object' &&
    raw !== null &&
    'price' in raw &&
    (raw as Record<string, unknown>).price === 0
  ) {
    (raw as Record<string, unknown>).price = null;
  }

  const result = searchParamsSchema.safeParse(raw);

  if (!result.success) {
    logger.warn(
      { errors: result.error.issues, attempt },
      '⚠️ LLM output failed Zod validation',
    );
    return null; // Signal the retry loop to try again
  }

  if (!result.data.is_food_related) {
    throw new BadRequestError(
      'This app only searches for restaurants and food. Try searching for a cuisine like "sushi" or "Italian".',
      { reason: 'NOT_FOOD_RELATED' },
    );
  }

  return result.data;
};

// ─── Orchestrator ─────────────────────────────────────────────────────────────

/**
 * Parses a natural language message into structured search parameters
 * using Google Gemini with structured output mode.
 *
 * Triple-validation pattern:
 *   Stage 1 — `sanitizeInput`       → strips adversarial unicode
 *   Stage 2 — `callLlm`             → Gemini SDK enforces JSON schema shape
 *   Stage 3 — `validateAndNormalize` → Zod enforces business rules + food guard
 *
 * @param message - The user's natural language search query
 * @returns Validated SearchParams
 * @throws BadRequestError if parsing fails after retries
 * @throws UpstreamError if the Gemini API is unavailable
 */
export const parseMessage = async (message: string): Promise<SearchParams> => {
  const sanitized = sanitizeInput(message); // Stage 1

  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const raw = await callLlm(sanitized, attempt); // Stage 2

      const params = validateAndNormalize(raw, attempt); // Stage 3

      if (params) {
        logger.info(
          { searchParams: params, attempt },
          '✅ LLM parsed message successfully',
        );
        return params;
      }

      // Zod validation failed — loop will retry
      lastError = new Error('Zod validation failed');
    } catch (error) {
      // Never retry on known semantic or upstream errors
      if (error instanceof BadRequestError || error instanceof UpstreamError) {
        throw error;
      }

      logger.error({ error, attempt }, '❌ LLM call failed');
      lastError = error;

      if (attempt === MAX_ATTEMPTS) break;
    }
  }

  // All attempts exhausted
  throw new BadRequestError(
    'Could not understand your search request. Please try rephrasing with a specific cuisine and location.',
    { originalError: String(lastError) },
  );
};
