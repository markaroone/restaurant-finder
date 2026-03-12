import { HTTP_STATUS } from '@/common/constants/app.constants';
import { Router, type Request, type Response } from 'express';

const router = Router();

/**
 * Health check endpoint.
 * Returns the service status, name, and current timestamp.
 */
router.get('/', (_req: Request, res: Response) => {
  res.status(HTTP_STATUS.OK).json({
    status: 'ok',
    service: 'restaurant-finder-api',
    timestamp: new Date().toISOString(),
  });
});

export const healthRoutes = router;
