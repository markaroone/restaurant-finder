import { env } from '@/config/env';
import pino, { type Logger } from 'pino';
import { APP_ENV, LOG_LEVEL } from '../constants/app.constants';

export const logger: Logger = pino({
  level:
    env.NODE_ENV === APP_ENV.DEVELOPMENT ? LOG_LEVEL.DEBUG : LOG_LEVEL.INFO,
  transport:
    env.NODE_ENV === APP_ENV.DEVELOPMENT
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});
