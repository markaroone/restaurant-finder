import { Type } from '@google/genai';

/**
 * JSON schema for Gemini structured output mode.
 * Forces the LLM to return exactly this shape.
 */
export const responseJsonSchema = {
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
} as const;

/**
 * Fixed system instruction. User input never goes here (prevents prompt injection).
 */
export const SYSTEM_INSTRUCTION = `You are a restaurant search parameter extractor.

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
- For district names, neighborhood abbreviations, or local shorthand (e.g. "BGC", "QC", "NAIA"), always expand "near" to include the city and country (e.g. "BGC" → "Bonifacio Global City, Taguig, Philippines", "QC" → "Quezon City, Metro Manila, Philippines", "DTLA" → "Downtown Los Angeles, CA, USA")
- For mixed-language queries, extract food and location separately and translate each to English

Handling contradictions:
- If the user provides contradictory price signals (e.g., "expensive but cheap"), default to price: 0 (unspecified)
- If the user provides contradictory open/closed signals, default to open_now: false
- Treat sarcasm as a literal query — do not try to infer the user's "real" intent

Unsearchable criteria:
- Ignore requests about specific deals, promotions, or freebies (e.g., "offers free cake")
- Ignore requests about specific menu items — focus only on cuisine TYPE
- Ignore requests about ambiance, dress code, parking, quality ratings (e.g., "best", "worst"), or non-food attributes
- These cannot be searched via the restaurant API; just extract what IS searchable

EXAMPLES (input → expected output):

User: "cheap sushi in downtown LA that's open now"
Output: {"is_food_related":true,"query":"sushi","near":"downtown Los Angeles, CA","price":1,"open_now":true,"limit":20}

User: "not too expensive ramen near me"
Output: {"is_food_related":true,"query":"ramen","near":"","price":2,"open_now":false,"limit":20}

User: "anything still serving in DTLA, something upscale"
Output: {"is_food_related":true,"query":"restaurant","near":"Downtown Los Angeles, CA","price":3,"open_now":true,"limit":20}

User: "🍕 near times square"
Output: {"is_food_related":true,"query":"pizza","near":"Times Square, New York City, NY","price":null,"open_now":false,"limit":20}

User: "find me a hospital"
Output: {"is_food_related":false,"query":"hospital","near":"","price":null,"open_now":false,"limit":20}

User: "拉麺 東京"
Output: {"is_food_related":true,"query":"ramen","near":"Tokyo, Japan","price":null,"open_now":false,"limit":20}`;

export const MODEL = 'gemini-2.5-flash';
export const MAX_ATTEMPTS = 2;

/**
 * Per-call timeout budget.
 *
 * Reduced from 15s to 8s to accommodate exponential backoff delays within
 * the 20s Express server timeout:
 *   Attempt 1: up to 8s + up to ~200ms jitter
 *   Attempt 2: up to 8s (last attempt — no delay after)
 *   Foursquare + middleware safety margin: ~2s
 *   Total worst case: ~18.2s ← fits inside 20s ✅
 *
 * The heuristic fallback acts as attempt 3 with zero latency budget.
 */
export const LLM_TIMEOUT_MS = 8_000; // 8s per attempt (was 15s)

/**
 * Base delay for exponential backoff between LLM retry attempts.
 * Full jitter is applied: actual delay is random in [0, BASE * 2^(attempt-1)].
 * With 2 attempts max, only one inter-attempt delay ever fires (max ~200ms).
 */
export const BASE_DELAY_MS = 200;
