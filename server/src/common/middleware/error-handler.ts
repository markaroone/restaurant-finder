import { APP_ENV, HTTP_STATUS } from '@/common/constants/app.constants';
import { AppError } from '@/common/utils/app-error';
import { logger } from '@/common/utils/logger';
import { env } from '@/config/env';
import { type ErrorRequestHandler, type Request } from 'express';
import { ProblemDocument } from '@/common/types/problem-document';

/**
 * Safely extracts a trace identifier from the request.
 */
const getTraceId = (request: Request): string => {
  const reqWithId = request as Request & { id?: unknown };
  const traceId = reqWithId.id;

  if (typeof traceId === 'string' && traceId) {
    return traceId;
  }

  const headerId = request.headers['x-request-id'];
  if (Array.isArray(headerId)) return headerId[0];
  if (typeof headerId === 'string') return headerId;

  return 'unknown';
};

/**
 * Global Error Handler.
 * Converts any thrown error into an RFC 7807 compatible Problem Document.
 */
export const errorHandler: ErrorRequestHandler = (
  err,
  request,
  response,
  _next,
) => {
  const error = err;

  // Extract error details
  const statusCode =
    error instanceof AppError
      ? error.statusCode
      : HTTP_STATUS.INTERNAL_SERVER_ERROR;

  const code = error instanceof AppError ? error.code : 'INTERNAL_SERVER_ERROR';
  const message =
    error instanceof AppError ? error.message : 'An unexpected error occurred.';

  // Log the error
  if (statusCode >= HTTP_STATUS.INTERNAL_SERVER_ERROR) {
    logger.error(error, `❌ Request failed: ${request.method} ${request.path}`);
  } else {
    logger.warn(
      `⚠️ Operational Error: ${message} (${request.method} ${request.path})`,
    );
  }

  // Construct Problem Document
  const problem: ProblemDocument = {
    type: `https://api.restaurant-finder.dev/errors/${code.toLowerCase().replace(/_/g, '-')}`,
    title: code.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
    status: statusCode,
    detail: message,
    instance: request.originalUrl || request.path,
    code,
    traceId: getTraceId(request),
    errors: error instanceof AppError ? error.errors : undefined,
    meta: error instanceof AppError ? error.meta : undefined,
    stack:
      env.NODE_ENV === APP_ENV.DEVELOPMENT &&
      statusCode === HTTP_STATUS.INTERNAL_SERVER_ERROR
        ? (error as Error).stack
        : undefined,
  };

  // Send the response
  response.status(statusCode).json(problem);
};
