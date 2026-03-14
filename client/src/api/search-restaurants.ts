import { apiClient } from '@/lib/api-client';
import type { ApiResponse } from '@/types/api.types';
import type { ExecuteResponse } from '@/types/restaurant';
import { withApiError } from '@/utils/with-api-error';

/**
 * Sends a natural language restaurant search query to the backend.
 * Accepts an optional `ll` (lat,lng) string for geolocation fallback.
 *
 * The caller (useSearchRestaurants hook) is responsible for reading
 * geolocation state — this keeps the API function pure.
 */
export const searchRestaurants = withApiError(
  async (
    message: string,
    ll?: string | null,
  ): Promise<ApiResponse<ExecuteResponse>> => {
    const params: Record<string, string> = {
      message,
      code: ENV.API_CODE,
    };

    if (ll) {
      params.ll = ll;
    }

    return apiClient
      .get('execute', { searchParams: params })
      .json<ApiResponse<ExecuteResponse>>();
  },
);
