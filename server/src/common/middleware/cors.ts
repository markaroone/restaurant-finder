import { APP_ENV, HTTP_STATUS } from '@/common/constants/app.constants';
import { AppError } from '@/common/utils/app-error';
import { env } from '@/config/env';
import cors from 'cors';

/**
 * CORS middleware with production-safe origin validation.
 *
 * In development: allows null-origin requests (curl, Postman).
 * In production: requires a valid Origin header from the allowed list.
 * This prevents sandboxed iframe / file:// CORS bypass attacks.
 *
 */
export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Null-origin requests: allow only in development (curl, Postman, etc.)
    // In production, block them to prevent sandboxed iframe CORS bypass.
    if (!origin) {
      if (env.NODE_ENV !== APP_ENV.PRODUCTION) return callback(null, true);
      return callback(
        new AppError(
          'Origin header required',
          HTTP_STATUS.FORBIDDEN,
          'FORBIDDEN',
        ),
      );
    }

    // Check if the origin is in the allowed list
    if (
      env.ALLOWED_ORIGINS.includes('*') ||
      env.ALLOWED_ORIGINS.includes(origin)
    ) {
      return callback(null, true);
    }

    return callback(
      new AppError('Not allowed by CORS', HTTP_STATUS.FORBIDDEN, 'FORBIDDEN'),
    );
  },
  credentials: true,
});
