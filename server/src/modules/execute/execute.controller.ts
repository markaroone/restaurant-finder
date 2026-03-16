import { Request, Response } from 'express';

import { handleSuccess } from '@/common/utils/response-handler';
import { executeSearch } from '@/modules/execute/execute.service';
import { ExecuteQueryInput } from './execute.schema';

/**
 * Handles GET /api/execute
 * Extracts the validated message, optional ll (lat,lng), and client IP.
 * Passes all three to the search pipeline for the location priority chain.
 */
export const search = async (
  req: Request<
    Record<string, string>,
    unknown,
    unknown,
    ExecuteQueryInput['query']
  >,
  res: Response,
): Promise<void> => {
  const { message, ll } = req.query;

  // Extract client IP for geoip fallback
  const clientIp = req.ip ?? req.socket.remoteAddress;

  const data = await executeSearch(message, ll, clientIp);

  handleSuccess({
    response: res,
    message: 'Restaurants found',
    data,
    meta: { resultCount: data.meta.resultCount },
  });
};
