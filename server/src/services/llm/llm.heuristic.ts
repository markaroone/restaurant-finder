import nlp from 'compromise';

import { logger } from '@/common/utils/logger';
import { SearchParams } from '@/modules/execute/execute.types';

// ─── Heuristic Fallback Parser ────────────────────────────────────────────────

/**
 * Price signal patterns for the heuristic fallback.
 * Ordered from cheapest to most expensive — first match wins.
 */
const PRICE_MAP: { patterns: RegExp[]; level: number }[] = [
  {
    patterns: [
      /\bcheap\b/i,
      /\baffordable\b/i,
      /\bbudget\b/i,
      /\binexpensive\b/i,
    ],
    level: 1,
  },
  {
    patterns: [/\bmoderate\b/i, /\bmid.?range\b/i, /\bnot too expensive\b/i],
    level: 2,
  },
  {
    patterns: [/\bupscale\b/i, /\bfancy\b/i, /\bexpensive\b/i],
    level: 3,
  },
  {
    patterns: [/\bfine dining\b/i, /\bluxury\b/i],
    level: 4,
  },
];

const OPEN_NOW_REGEX =
  /\bopen\s*now\b|\bright\s*now\b|\bcurrently\s*open\b|\bstill\s*(open|serving)\b|\bopen\s*rn\b|\bopen\s*late\b/i;

const STOP_WORDS = new Set([
  'find',
  'me',
  'a',
  'an',
  'the',
  'i',
  'want',
  'looking',
  'for',
  'somewhere',
  'place',
  'restaurant',
  'in',
  'near',
  'around',
  'is',
  'that',
  'which',
  'and',
  'with',
  'to',
  'my',
  'some',
  'good',
  'great',
  'best',
  'get',
  'show',
  'know',
  'any',
  'now',
  'open',
  'still',
  'serving',
]);

/**
 * Extracts a location string using compromise's built-in place tagger.
 *
 * @param doc - A parsed compromise document
 * @returns The extracted place name, or an empty string if none found
 * @example extractLocation(nlp("sushi in Tokyo")) // "Tokyo"
 * @example extractLocation(nlp("cheap pizza"))    // ""
 */
const extractLocation = (doc: ReturnType<typeof nlp>): string =>
  doc.places().text() ?? '';

/**
 * Detects the user's price preference by matching against known price signal
 * patterns. Iterates from cheapest (1) to most expensive (4) — first match wins.
 *
 * @param message - The raw user message
 * @returns Price level 1–4, or `null` if no price signal found
 * @example detectPriceLevel("cheap ramen near me")      // 1
 * @example detectPriceLevel("fine dining in Manhattan")  // 4
 * @example detectPriceLevel("pizza in LA")               // null
 */
const detectPriceLevel = (message: string): number | null => {
  for (const { patterns, level } of PRICE_MAP) {
    if (patterns.some((regex) => regex.test(message))) {
      return level;
    }
  }
  return null;
};

/**
 * Checks if the message contains phrases indicating the user wants
 * currently-open restaurants (e.g., "open now", "still serving", "open rn").
 *
 * @param message - The raw user message
 * @returns `true` if open-now intent is detected
 * @example detectOpenNow("sushi open now")       // true
 * @example detectOpenNow("pizza in Los Angeles") // false
 */
const detectOpenNow = (message: string): boolean =>
  OPEN_NOW_REGEX.test(message);

/**
 * Extracts food-relevant query tokens by stripping stop words, punctuation,
 * and any words that already appear in the extracted location.
 * Falls back to `"restaurant"` if no meaningful tokens remain.
 *
 * @param message - The raw user message
 * @param near - The already-extracted location string (used to exclude its words)
 * @returns A space-joined query string for the Foursquare API
 * @example extractQueryTokens("find me cheap pizza in Los Angeles", "Los Angeles") // "cheap pizza"
 * @example extractQueryTokens("show me something in Tokyo", "Tokyo")               // "something"
 * @example extractQueryTokens("find me a restaurant in NYC", "NYC")                // "restaurant" (fallback default)
 */
const extractQueryTokens = (message: string, near: string): string => {
  const locationWords = new Set(near.toLowerCase().split(/\s+/));
  const tokens = message
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w) && !locationWords.has(w));

  return tokens.join(' ') || 'restaurant';
};

/**
 * Local heuristic fallback parser using `compromise` NLP + regex price signals.
 * Used as a graceful degradation path when the Gemini API is unavailable.
 *
 * Accuracy limitations compared to the LLM:
 * - Cannot parse emoji, non-Latin scripts, or negations correctly
 * - Location extraction depends on compromise's built-in place tagging
 * - Always sets is_food_related to true (no food guard)
 *
 * @param message - The user's natural language search query
 * @returns A best-effort SearchParams (never throws)
 */
export const parseMessageHeuristic = async (
  message: string,
): Promise<SearchParams> => {
  const doc = nlp(message);

  const near = extractLocation(doc);
  const price = detectPriceLevel(message);
  const open_now = detectOpenNow(message);
  const query = extractQueryTokens(message, near);

  const params: SearchParams = {
    query,
    near,
    min_price: price,
    max_price: price,
    open_now,
    is_food_related: true,
  };

  logger.warn(
    { params },
    '⚡ Heuristic fallback parser used (Gemini unavailable)',
  );

  return params;
};
