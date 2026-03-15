import { GoogleGenAI } from '@google/genai';

import { BadRequestError, UpstreamError } from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import { sanitizeUnicode } from '@/common/utils/sanitize';
import { env } from '@/config/env';
import { searchParamsSchema } from '@/modules/execute/execute.schema';
import { SearchParams } from '@/modules/execute/execute.types';

import {
  LLM_TIMEOUT_MS,
  MAX_ATTEMPTS,
  MODEL,
  SYSTEM_INSTRUCTION,
  responseJsonSchema,
} from './llm.constants';
import { guardOutput } from './llm.guards';

const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

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

  // Log token usage for monitoring (zero overhead — reads existing field)
  if (response.usageMetadata) {
    logger.info({ tokens: response.usageMetadata, attempt }, '📊 Token usage');
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
 * Five-layer defense pipeline:
 *   Pre-screen — `detectInjection`   → regex catches known injection patterns
 *   Stage 1   — `sanitizeInput`      → strips adversarial unicode
 *   Stage 2   — `callLlm`            → Gemini SDK enforces JSON schema shape (+ token logging)
 *   Stage 3   — `validateAndNormalize` → Zod enforces business rules + food guard
 *   Post-gate — `guardOutput`        → checks for prompt leakage + PII in output
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
        guardOutput(params); // Post-gate
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
  throw new UpstreamError(
    'The AI parsing service is currently unavailable. Please try again shortly.',
    { originalError: String(lastError) },
  );
};
