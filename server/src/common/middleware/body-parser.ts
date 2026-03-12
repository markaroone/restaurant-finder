import express, { type RequestHandler } from 'express';
import { BadRequestError } from '../utils/api-errors';

const jsonParser = express.json({ limit: '10mb' });
const urlEncodedParser = express.urlencoded({
  extended: true,
  limit: '10mb',
});

export const jsonBodyParser: RequestHandler = (req, res, next) => {
  jsonParser(req, res, (err?: unknown) => {
    if (err) {
      // Catch syntax errors (e.g., invalid JSON) from body-parser
      if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
        return next(
          new BadRequestError(
            'Invalid JSON format. Please check your request body.',
          ),
        );
      }
      return next(err);
    }
    next();
  });
};

export const urlEncodedBodyParser: RequestHandler = (req, res, next) => {
  urlEncodedParser(req, res, (err?: unknown) => {
    if (err) {
      if (err instanceof SyntaxError && 'status' in err && err.status === 400) {
        return next(
          new BadRequestError('Invalid URL encoded data.', undefined),
        );
      }
      return next(err); // Pass other errors (like payload too large)
    }
    next();
  });
};
