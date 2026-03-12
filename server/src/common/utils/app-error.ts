import { HTTP_STATUS } from '@/common/constants/app.constants';
import { ValidationErrorDetail } from '@/common/types/problem-document';

/**
 * Enhanced Base Error class for the application.
 * Supports RFC 7807 standard fields.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly errors?: ValidationErrorDetail[];
  public readonly meta?: Record<string, unknown>;

  constructor(
    message: string,
    statusCode: number = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    code: string = 'INTERNAL_SERVER_ERROR',
    errors?: ValidationErrorDetail[],
    meta?: Record<string, unknown>,
  ) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;
    this.meta = meta;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}
