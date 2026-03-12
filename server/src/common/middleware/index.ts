// src/common/middleware/index.ts
import { Express } from 'express';
import helmet from 'helmet';
import { jsonBodyParser, urlEncodedBodyParser } from './body-parser';
import { compressionMiddleware } from './compression';
import { corsMiddleware } from './cors';
import { rateLimiterMiddleware } from './rate-limiter';
import { requestLoggerMiddleware } from './request-logger';

/**
 * Registers all non-route specific global middlewares.
 */
export const registerGlobalMiddleware = (app: Express): void => {
  app.use(helmet());
  app.use(corsMiddleware);
  app.use(compressionMiddleware);
  app.use(jsonBodyParser);
  app.use(urlEncodedBodyParser);
  app.use(requestLoggerMiddleware);
  app.use(rateLimiterMiddleware);
};
