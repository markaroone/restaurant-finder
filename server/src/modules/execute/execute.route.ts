import { Router } from 'express';

import { codeGateMiddleware } from '@/common/middleware/code-gate.middleware';
import { validateRequest } from '@/common/middleware/validation';
import * as executeController from '@/modules/execute/execute.controller';
import { executeLimiter } from '@/modules/execute/execute.middleware';
import { executeQuerySchema } from '@/modules/execute/execute.schema';

const router = Router();

/**
 * GET /api/execute
 *
 * Middleware chain:
 * 1. codeGateMiddleware — validates `code=pioneerdevai`
 * 2. executeLimiter — 10 req/min per IP (protects API budget)
 * 3. validateRequest — validates `message` via Zod schema
 * 4. executeController.search — handles the request
 */
router.get(
  '/execute',
  codeGateMiddleware,
  executeLimiter,
  validateRequest(executeQuerySchema),
  executeController.search,
);

export const executeRoutes = router;
