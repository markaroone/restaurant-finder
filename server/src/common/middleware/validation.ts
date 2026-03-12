import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { ValidationErrorDetail } from '@/common/types/problem-document';
import { ValidationError } from '@/common/utils/api-errors';

/**
 * Helper to safely overwrite protected request properties.
 */
const setRequestProperty = (
  req: Request<
    Record<string, unknown>,
    unknown,
    unknown,
    Record<string, unknown>
  >,
  key: 'body' | 'query' | 'params',
  value: unknown,
) => {
  if (value === undefined) return;
  Object.defineProperty(req, key, {
    value,
    configurable: true,
    writable: true,
    enumerable: true,
  });
};

/**
 * Validates the request against a Zod schema.
 * Supports validating body, query, and params.
 */
export const validateRequest = (schema: z.ZodType) => {
  return async (
    req: Request<
      Record<string, unknown>,
      unknown,
      unknown,
      Record<string, unknown>
    >,
    _res: Response,
    next: NextFunction,
  ) => {
    try {
      const parsed = await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });

      if (typeof parsed === 'object' && parsed !== null) {
        const data = parsed as Record<string, unknown>;
        req.validatedData = data;
        setRequestProperty(req, 'body', data.body);
        setRequestProperty(req, 'query', data.query);
        setRequestProperty(req, 'params', data.params);
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors: ValidationErrorDetail[] = error.issues.map((err) => {
          const issue = err as z.ZodIssue & {
            received?: unknown;
            params?: Record<string, unknown>;
          };

          return {
            field: err.path.join('.').replace(/^(body|query|params)\./, ''),
            code: err.code.toLowerCase(),
            message: err.message,
            value: issue.received,
            params: issue.params,
          };
        });

        return next(
          new ValidationError(
            'One or more fields in your request are invalid.',
            errors,
          ),
        );
      }
      return next(error);
    }
  };
};
