import { app } from '@/app';
import { logger } from '@/common/utils/logger';
import { env } from '@/config/env';

const server = app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT}`);
  logger.info(`🌍 Environment: ${env.NODE_ENV}`);
});

// Graceful Shutdown
const onClose = (signal: string) => {
  logger.info(`👋 ${signal} received, shutting down...`);
  server.close(() => {
    logger.info('✅ Server closed cleanly');
    process.exit(0);
  });
};

process.on('SIGINT', () => onClose('SIGINT'));
process.on('SIGTERM', () => onClose('SIGTERM'));
