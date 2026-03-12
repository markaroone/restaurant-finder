import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types/api.types';
import type { ExecuteResponse } from '@/types/restaurant';
import { logger } from '@/utils/logger';
import { withApiError } from '@/utils/with-api-error';

/**
 * Sends a natural language restaurant search query to the backend.
 * The backend uses an LLM to parse the query and calls the Foursquare API.
 */
export const searchRestaurants = withApiError(
  async (message: string): Promise<ApiResponse<ExecuteResponse>> => {
    logger.log(ENV.API_CODE);

    return apiClient
      .get('execute', {
        searchParams: { message, code: ENV.API_CODE },
      })
      .json<ApiResponse<ExecuteResponse>>();
  },
);
