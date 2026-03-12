import { logger } from '@/common/utils/logger';
import { env } from '@/config/env';
import { pinoHttp, type Options } from 'pino-http';
import { APP_ENV } from '../constants/app.constants';

export const requestLoggerMiddleware = pinoHttp({
  logger: logger as Options['logger'],
  // Reduce noise in dev: don't log successful health checks or static asset requests or tests
  autoLogging: {
    ignore: (req) => {
      if (
        (env.NODE_ENV === APP_ENV.DEVELOPMENT && req.url === '/health') ||
        env.NODE_ENV === APP_ENV.TEST
      )
        return true;
      return false;
    },
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      query: req.query,
      params: req.params,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
});
