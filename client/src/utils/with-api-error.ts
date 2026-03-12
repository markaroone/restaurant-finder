import { resolveApiError } from './api-error';
import { logger } from './logger';

/**
 * Higher-order function to wrap API calls.
 * It automatically checks for HTTP errors, parses them into an ApiErrorResponse,
 * and throws a resolved ApiError.
 */
export const withApiError =
  <Params extends Array<unknown> = Array<unknown>, ResponseType = unknown>(
    fn: (...params: Params) => Promise<ResponseType>,
  ) =>
  async (...params: Params): Promise<ResponseType> => {
    try {
      return await fn(...params);
    } catch (error) {
      const resolvedError = await resolveApiError(error);
      logger.error('API Error:', resolvedError);
      throw resolvedError;
    }
  };
