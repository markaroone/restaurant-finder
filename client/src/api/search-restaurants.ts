import { apiClient } from '@/lib/api-client';
import { getGeolocationState } from '@/stores/geolocation-store';
import type { ApiResponse } from '@/types/api.types';
import type { ExecuteResponse } from '@/types/restaurant';
import { withApiError } from '@/utils/with-api-error';

/**
 * Sends a natural language restaurant search query to the backend.
 * Attaches browser geolocation as `ll` (lat,lng) when available,
 * so the backend can use it as a fallback when the LLM can't extract a location.
 */
export const searchRestaurants = withApiError(
  async (message: string): Promise<ApiResponse<ExecuteResponse>> => {
    const params: Record<string, string> = {
      message,
      code: ENV.API_CODE,
    };

    // Attach geolocation if available (imperative read — no subscription)
    const { lat, lng, status } = getGeolocationState();
    if (status === 'granted' && lat != null && lng != null) {
      params.ll = `${lat},${lng}`;
    }

    return apiClient
      .get('execute', { searchParams: params })
      .json<ApiResponse<ExecuteResponse>>();
  },
);
