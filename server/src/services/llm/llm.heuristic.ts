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

  // Extract location via compromise's place tagger
  const near = doc.places().text() ?? '';

  // Extract price
  let price: number | null = null;
  for (const { patterns, level } of PRICE_MAP) {
    if (patterns.some((regex) => regex.test(message))) {
      price = level;
      break;
    }
  }

  // Extract open_now
  const open_now = OPEN_NOW_REGEX.test(message);

  // Extract query: remove stop words and the extracted location
  const locationWords = new Set(near.toLowerCase().split(/\s+/));
  const queryTokens = message
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 0 && !STOP_WORDS.has(w) && !locationWords.has(w));

  const query = queryTokens.join(' ') || 'restaurant';

  const params: SearchParams = {
    query,
    near,
    price,
    open_now,
    limit: 20,
    is_food_related: true,
  };

  logger.warn(
    { params },
    '⚡ Heuristic fallback parser used (Gemini unavailable)',
  );

  return params;
};
