import { Router } from 'express';

import { codeGateMiddleware } from '@/common/middleware/code-gate.middleware';
import { validateRequest } from '@/common/middleware/validation';
import { executeQuerySchema } from '@/modules/execute/execute.schema';
import * as executeController from '@/modules/execute/execute.controller';

const router = Router();

/**
 * GET /api/execute
 *
 * Middleware chain:
 * 1. codeGateMiddleware — validates `code=pioneerdevai`
 * 2. validateRequest — validates `message` via Zod schema
 * 3. executeController.search — handles the request
 */
router.get(
  '/execute',
  codeGateMiddleware,
  validateRequest(executeQuerySchema),
  executeController.search,
);

export const executeRoutes = router;
