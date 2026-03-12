import { HTTPError } from 'ky';

import type {
  ApiErrorResponse,
  ValidationErrorDetail,
} from '@/types/api.types';

import { logger } from './logger';

/**
 * Client-side representation of an API error.
 * Mirrors the backend RFC 7807 ProblemDocument.
 */
export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly detail: string;
  public readonly errors?: ValidationErrorDetail[];
  public readonly meta?: Record<string, unknown>;
  public readonly traceId?: string;
  public readonly response: ApiErrorResponse | null;
  public readonly originalError: unknown;

  constructor(response: ApiErrorResponse | null, originalError: unknown) {
    super(
      response?.detail ||
        (originalError instanceof Error
          ? originalError.message
          : 'An unexpected error occurred.'),
    );
    this.name = 'ApiError';
    this.status = response?.status || 500;
    this.code = response?.code || 'UNKNOWN_ERROR';
    this.detail = response?.detail || this.message;
    this.errors = response?.errors;
    this.meta = response?.meta;
    this.traceId = response?.traceId;
    this.response = response;
    this.originalError = originalError;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

/**
 * Resolves any thrown error into a structured ApiError.
 */
export const resolveApiError = async (error: unknown): Promise<ApiError> => {
  if (error instanceof ApiError) {
    return error;
  }

  if (error instanceof HTTPError) {
    try {
      const errorData = (await error.response.json()) as ApiErrorResponse;
      return new ApiError(errorData, error);
    } catch {
      logger.error('Failed to parse HTTPError response as JSON', error);
      return new ApiError(null, error);
    }
  }

  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    return new ApiError(
      {
        type: 'network-error',
        title: 'Network Error',
        status: 0,
        detail:
          'Failed to connect to the server. Please check your internet connection.',
        instance: '',
        code: 'NETWORK_ERROR',
        traceId: '',
      },
      error,
    );
  }

  return new ApiError(null, error);
};
