import { type Response } from 'express';

import { HTTP_STATUS } from '@/common/constants/app.constants';

type BaseOptions = {
  response: Response;
  statusCode?: number;
  message?: string;
  meta?: Record<string, unknown>;
};

export type SuccessResponseOptions<T> = BaseOptions & {
  data?: T;
};

/**
 * Sends a standardized success response.
 * Always use this instead of `res.json()` directly.
 */
export const handleSuccess = <T>({
  response,
  statusCode = HTTP_STATUS.OK,
  message,
  data,
  meta,
}: SuccessResponseOptions<T>): void => {
  response.status(statusCode).json({
    status: 'success',
    message: message || 'Success',
    data: data ?? null,
    ...(meta && Object.keys(meta).length > 0 && { meta }),
  });
};
