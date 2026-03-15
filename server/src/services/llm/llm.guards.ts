import { BadRequestError } from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import { SearchParams } from '@/modules/execute/execute.types';
import { remove as removeConfusables } from 'confusables';

// ─── Pre-screen: Prompt Injection Detection ──────────────────────────────────

/**
 * Common prompt injection patterns that attempt to override system instructions.
 * This is a "speed bump" defense — catches low-effort injection attempts before
 * we spend API credits. The real structural defense is our JSON-schema-constrained output.
 */
const INJECTION_PATTERNS = [
  /ignore (all )?(previous |prior |above )?instructions/i,
  /you are now/i,
  /new (system )?(prompt|instruction)/i,
  /forget (what|everything)/i,
  /disregard (your|the) (rules|instructions)/i,
  /\bsystem:\s/i,
  /---\s*end\s*(system)?\s*prompt\s*---/i,
];

/**
 * Pre-screens user input for known prompt injection patterns.
 * Runs before any sanitization or LLM call to short-circuit obvious attacks.
 *
 * Uses the `confusables` package to normalize Unicode homoglyphs before matching,
 * preventing bypass via visually identical characters from non-Latin scripts
 * (e.g., Cyrillic "і" U+0456 looks identical to ASCII "i").
 *
 * @throws BadRequestError if a known injection pattern is detected
 */
export const detectInjection = (message: string): void => {
  // Normalize Unicode confusables → ASCII before pattern matching
  const normalized = removeConfusables(message);

  const isInjection = INJECTION_PATTERNS.some((pattern) =>
    pattern.test(normalized),
  );

  if (isInjection) {
    logger.warn({ message }, '🛡️ Prompt injection attempt detected');
    throw new BadRequestError(
      'Your message could not be processed. Please try a food or restaurant search.',
      { reason: 'PROMPT_INJECTION' },
    );
  }
};

// ─── Post-validation: Output Filtering ────────────────────────────────────────

/**
 * Checks for system prompt leakage in output fields (e.g., if the LLM echoed
 * fragments of our system instruction) and PII patterns (phone numbers, emails).
 *
 * @throws BadRequestError if suspicious content is detected in the output
 */
const PII_REGEX = /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b|\b[\w.]+@[\w.]+\.\w+\b/;

const LEAKAGE_KEYWORDS = [
  'system instruction',
  'parameter extractor',
  'extraction rules',
  'set is_food_related',
];

export const guardOutput = (params: SearchParams): void => {
  const fieldsToCheck = [params.query, params.near];

  for (const field of fieldsToCheck) {
    // Check for system prompt leakage
    const lower = field.toLowerCase();
    const leaked = LEAKAGE_KEYWORDS.some((keyword) => lower.includes(keyword));

    if (leaked) {
      logger.warn({ field }, '🛡️ Output contains system prompt leakage');
      throw new BadRequestError(
        'Your message could not be processed. Please try a food or restaurant search.',
        { reason: 'OUTPUT_FILTERED' },
      );
    }

    // Check for PII in output
    if (PII_REGEX.test(field)) {
      logger.warn({ field }, '🛡️ Output contains potential PII');
      throw new BadRequestError(
        'Your message could not be processed. Please try a food or restaurant search.',
        { reason: 'OUTPUT_FILTERED' },
      );
    }
  }
};
