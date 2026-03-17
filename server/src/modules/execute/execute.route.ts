import { Router } from 'express';

import { codeGateMiddleware } from '@/common/middleware/code-gate.middleware';
import { validateRequest } from '@/common/middleware/validation';
import * as executeController from '@/modules/execute/execute.controller';
import {
  executeLimiter,
  injectionGuard,
} from '@/modules/execute/execute.middleware';
import { executeQuerySchema } from '@/modules/execute/execute.schema';

const router = Router();

/**
 * GET /api/execute
 *
 * Middleware chain:
 * 1. executeLimiter — 10 req/min per IP (cheapest check first; protects auth from brute-force)
 * 2. codeGateMiddleware — validates `code=<access_code>`
 * 3. validateRequest — validates + sanitizes `message` via Zod schema transforms
 * 4. injectionGuard — regex catches known prompt injection patterns on clean text
 * 5. executeController.search — handles the request
 */
router.get(
  '/execute',
  executeLimiter,
  codeGateMiddleware,
  validateRequest(executeQuerySchema),
  injectionGuard,
  executeController.search,
);

export const executeRoutes = router;
