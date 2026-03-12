/**
 * Standard API success response.
 */
export type ApiResponse<T> = {
  status: 'success';
  message: string;
  data: T;
  meta?: Record<string, unknown>;
};

/**
 * Detail structure for validation errors.
 */
export type ValidationErrorDetail = {
  field?: string;
  message: string;
  [key: string]: unknown;
};

/**
 * RFC 7807 Error Response.
 * Maps directly to the backend ProblemDocument / AppError.
 */
export type ApiErrorResponse = {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  traceId: string;
  errors?: ValidationErrorDetail[];
  meta?: Record<string, unknown>;
  stack?: string;
};
