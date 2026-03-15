import { HTTP_STATUS } from '@/common/constants/app.constants';
import { ValidationErrorDetail } from '@/common/types/problem-document';
import { AppError } from './app-error';

/**
 * Thrown when the request cannot be processed due to bad syntax (400).
 */
export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request', meta?: Record<string, unknown>) {
    super(message, HTTP_STATUS.BAD_REQUEST, 'BAD_REQUEST', undefined, meta);
  }
}

/**
 * Thrown when a request lacks valid authentication credentials (401).
 */
export class UnauthorizedError extends AppError {
  constructor(
    message: string = 'Unauthorized access',
    meta?: Record<string, unknown>,
  ) {
    super(message, HTTP_STATUS.UNAUTHORIZED, 'UNAUTHORIZED', undefined, meta);
  }
}

/**
 * Thrown when the user has sent too many requests (429).
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    meta?: Record<string, unknown>,
  ) {
    super(
      message,
      HTTP_STATUS.TOO_MANY_REQUESTS,
      'TOO_MANY_REQUESTS',
      undefined,
      meta,
    );
  }
}

/**
 * Thrown when input validation fails (422).
 */
export class ValidationError extends AppError {
  constructor(
    message: string = 'Validation failed',
    errors: ValidationErrorDetail[] = [],
    meta?: Record<string, unknown>,
  ) {
    super(
      message,
      HTTP_STATUS.UNPROCESSABLE_ENTITY,
      'VALIDATION_ERROR',
      errors,
      meta,
    );
  }
}

/**
 * Thrown when an external upstream service fails (502).
 * Used for Gemini API and Foursquare API failures.
 */
export class UpstreamError extends AppError {
  constructor(
    message: string = 'External service unavailable',
    meta?: Record<string, unknown>,
  ) {
    super(message, HTTP_STATUS.BAD_GATEWAY, 'UPSTREAM_ERROR', undefined, meta);
  }
}

/**
 * Thrown when the server cannot produce a response in time (504).
 */
export class GatewayTimeoutError extends AppError {
  constructor(
    message: string = 'The request took too long to process. Please try again.',
    meta?: Record<string, unknown>,
  ) {
    super(
      message,
      HTTP_STATUS.GATEWAY_TIMEOUT,
      'GATEWAY_TIMEOUT',
      undefined,
      meta,
    );
  }
}
/**
 * Thrown when Foursquare cannot geocode the LLM-extracted `near` value (400).
 * Indicates a user-fixable input: the location needs more context (e.g. country/city).
 * Meta includes the raw `near` string and a geoip-derived `suggestion` for the UI.
 */
export class AmbiguousLocationError extends AppError {
  constructor(
    near: string,
    suggestion: string,
    meta?: Record<string, unknown>,
  ) {
    super(
      `Could not determine boundaries for location: "${near}". Try adding more context, like a city or country.`,
      HTTP_STATUS.BAD_REQUEST,
      'AMBIGUOUS_LOCATION',
      undefined,
      { near, suggestion, ...meta },
    );
  }
}
