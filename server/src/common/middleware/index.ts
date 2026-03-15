// src/common/middleware/index.ts
import { Express } from 'express';
import helmet from 'helmet';
import { jsonBodyParser, urlEncodedBodyParser } from './body-parser';
import { compressionMiddleware } from './compression';
import { corsMiddleware } from './cors';
import { rateLimiterMiddleware } from './rate-limiter';
import { requestLoggerMiddleware } from './request-logger';
import { requestTimeoutMiddleware } from './request-timeout';

/**
 * Registers all non-route-specific global middleware and app-level settings.
 *
 * **Ordering matters:**
 * 1. `trust proxy` — must be set before any middleware that reads `req.ip`
 *    (rate limiter, request logger, geoip). Without this, `req.ip` returns
 *    the reverse proxy's internal IP (e.g. `10.0.0.1`) instead of the real
 *    client IP when deployed behind Render, Railway, or similar PaaS.
 * 2. `helmet` — security headers
 * 3. `cors` — origin validation
 * 4. `compression` — response compression
 * 5. `requestTimeout` — 20s server-side timeout (ADR-013)
 * 6. `bodyParser` — JSON / URL-encoded parsing
 * 7. `requestLogger` — pino-http request logging
 * 8. `rateLimiter` — global 100 req / 15 min per IP
 */
export const registerGlobalMiddleware = (app: Express): void => {
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(compressionMiddleware);
  app.use(requestTimeoutMiddleware);
  app.use(jsonBodyParser);
  app.use(urlEncodedBodyParser);
  app.use(requestLoggerMiddleware);
  app.use(rateLimiterMiddleware);
};
