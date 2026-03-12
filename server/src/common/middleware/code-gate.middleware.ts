import { NextFunction, Request, Response } from 'express';

import { UnauthorizedError } from '@/common/utils/api-errors';

const ACCESS_CODE = 'pioneerdevai';

/**
 * Code-Gate Middleware.
 * Validates the static access code required for all API requests.
 * Expects `code` as a query parameter matching the pre-shared access code.
 */
export const codeGateMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction,
): void => {
  const code = req.query.code;

  if (code !== ACCESS_CODE) {
    throw new UnauthorizedError('Invalid or missing access code');
  }

  next();
};
