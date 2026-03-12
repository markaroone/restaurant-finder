import express from 'express';
import helmet from 'helmet';
import { errorHandler } from '@/common/middleware/error-handler';
import { registerGlobalMiddleware } from '@/common/middleware';
import { healthRoutes } from '@/modules/health/health.routes';

export const app = express();

// Security headers
app.use(helmet());

// Global middleware
registerGlobalMiddleware(app);

// Health check
app.use('/health', healthRoutes);

// API routes
// TODO: Mount execute routes here in Phase 2
// app.use('/api', executeRoutes);

// Global error handler (must be last)
app.use(errorHandler);
