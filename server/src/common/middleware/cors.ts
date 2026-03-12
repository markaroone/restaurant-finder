import { HTTP_STATUS } from '@/common/constants/app.constants';
import { AppError } from '@/common/utils/app-error';
import { env } from '@/config/env';
import cors from 'cors';

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

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
