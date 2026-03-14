import rateLimit from 'express-rate-limit';

import { APP_ENV } from '@/common/constants/app.constants';
import { RateLimitError } from '@/common/utils/api-errors';
import { env } from '@/config/env';

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
