import { BadRequestError } from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import { SearchParams } from '@/modules/execute/execute.types';

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
