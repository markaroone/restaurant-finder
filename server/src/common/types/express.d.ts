declare global {
  namespace Express {
    interface Request {
      /**
       * Useful for storing validated data from Zod middleware.
       */
      validatedData?: unknown;
    }
  }
}

export {};
