import ky from 'ky';

const createApiClient = () => {
  return ky.create({
    prefixUrl: ENV.API_URL,
    timeout: 30_000, // 30 seconds
  });
};

export const apiClient = createApiClient();
