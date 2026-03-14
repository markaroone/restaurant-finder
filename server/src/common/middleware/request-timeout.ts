import { RequestHandler } from 'express';

import { GatewayTimeoutError } from '@/common/utils/api-errors';

/**
 * Server-side request timeout.
 *
 * Ensures the server responds before the client's 30s ky timeout fires,
 * preventing orphaned backend work when the client disconnects.
 *
 * Delegates to the global error handler via next(error) so the RFC 7807
 * response is formatted consistently with all other errors.
 *
 * Timeout budget:
 *   Client ky: 30s → Express: 20s → Gemini: 15s → Foursquare: 10s
 *
 * @see ADR-013 in _docs/decisions.md
 */
const REQUEST_TIMEOUT_MS = 20_000; // 20 seconds

export const requestTimeoutMiddleware: RequestHandler = (_req, res, next) => {
  res.setTimeout(REQUEST_TIMEOUT_MS, () => {
    if (!res.headersSent) {
      next(new GatewayTimeoutError());
    }
  });

  next();
};
