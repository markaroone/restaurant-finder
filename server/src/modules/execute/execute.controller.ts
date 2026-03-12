import { Request, Response } from 'express';

import { executeSearch } from '@/modules/execute/execute.service';
import { handleSuccess } from '@/common/utils/response-handler';

/**
 * Handles GET /api/execute
 * Extracts the validated message from query params,
 * runs the search pipeline, and returns the results.
 *
 * No try-catch needed — Express 5 catches async errors automatically.
 */
export const search = async (req: Request, res: Response): Promise<void> => {
  const { message } = req.query as { message: string };

  const data = await executeSearch(message);

  handleSuccess({
    response: res,
    message: 'Restaurants found',
    data,
    meta: { resultCount: data.meta.resultCount },
  });
};
