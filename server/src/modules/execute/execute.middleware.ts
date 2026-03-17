import { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';

import { APP_ENV } from '@/common/constants/app.constants';
import { BadRequestError, RateLimitError } from '@/common/utils/api-errors';
import { logger } from '@/common/utils/logger';
import { env } from '@/config/env';

import { ExecuteQueryInput } from './execute.schema';

// ─── Rate Limiting ───────────────────────────────────────────────────────────

const ONE_MINUTE = 60 * 1000;
const WINDOW_MS = ONE_MINUTE;
const MAX_REQUESTS = 10;
/**
 * Per-route rate limiter for the execute endpoint.
 * Tighter than the global limiter since each call triggers
 * Gemini + Foursquare API costs.
 *
 * @see ADR-010 in _docs/decisions.md
 */
export const executeLimiter = rateLimit({
  windowMs: WINDOW_MS,
  limit: MAX_REQUESTS,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === APP_ENV.TEST,
  handler: (_req, _res, next) => {
    next(
      new RateLimitError('Too many searches. Please slow down and try again.'),
    );
  },
});

// ─── Injection Detection ─────────────────────────────────────────────────────

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
 * Prompt injection detection middleware.
 * Runs after Zod validation (which already sanitized the message via transforms),
 * so pattern matching operates on clean, normalized text.
 *
 * Pipeline order in route chain:
 *   rate limit → auth → validate (+ sanitize) → **injectionGuard** → handler
 *
 * @see ADR-022 in _docs/decisions.md
 * @throws BadRequestError with reason PROMPT_INJECTION if a pattern matches
 */
export const injectionGuard = (
  req: Request<
    Record<string, string>,
    unknown,
    unknown,
    ExecuteQueryInput['query']
  >,
  _res: Response,
  next: NextFunction,
): void => {
  const message = req.query.message; // already sanitized by Zod transform

  const isInjection = INJECTION_PATTERNS.some((pattern) =>
    pattern.test(message),
  );

  if (isInjection) {
    logger.warn({ message }, '🛡️ Prompt injection attempt detected');
    throw new BadRequestError(
      'Your message could not be processed. Please try a food or restaurant search.',
      { reason: 'PROMPT_INJECTION' },
    );
  }

  next();
};
