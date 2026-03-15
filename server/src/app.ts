import { registerGlobalMiddleware } from '@/common/middleware';
import { errorHandler } from '@/common/middleware/error-handler';
import { executeRoutes } from '@/modules/execute/execute.route';
import { healthRoutes } from '@/modules/health/health.routes';
import express from 'express';

export const app = express();

// Global middleware (includes trust proxy configuration)
registerGlobalMiddleware(app);

// Health check
app.use('/health', healthRoutes);

// API routes
app.use('/api', executeRoutes);

// Global error handler (must be last)
app.use(errorHandler);
