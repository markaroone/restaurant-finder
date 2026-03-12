import { APP_ENV, RATE_LIMIT } from '@/common/constants/app.constants';
import { RateLimitError } from '@/common/utils/api-errors';
import { env } from '@/config/env';
import rateLimit from 'express-rate-limit';

/**
 * Global Rate Limiter.
 * Prevents abuse by limiting the number of requests from a single IP.
 */
export const rateLimiterMiddleware = rateLimit({
  windowMs: RATE_LIMIT.WINDOW_MS,
  limit: RATE_LIMIT.MAX_REQUESTS,
  standardHeaders: 'draft-7', // draft-6: `RateLimit-*` headers; draft-7: combined `RateLimit` header
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers

  // Skip rate limiting in development/test for easier testing
  skip: () => env.NODE_ENV === APP_ENV.TEST,

  // Use our standard JSON error format
  handler: (_req, _res, next) => {
    next(new RateLimitError('Too many requests. Please try again later.'));
  },
});
