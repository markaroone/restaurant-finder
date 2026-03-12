/* eslint-disable no-console */

/**
 * Signature of a logging function.
 */
export type LogFn = (message?: unknown, ...optionalParams: unknown[]) => void;

export type LogLevel = 'log' | 'warn' | 'error';

const NO_OP: LogFn = () => {};

class ConsoleLogger {
  readonly log: LogFn;
  readonly warn: LogFn;
  readonly error: LogFn;

  constructor(options?: { level?: LogLevel }) {
    const { level } = options || {};

    this.error = console.error.bind(console);

    if (level === 'error') {
      this.warn = NO_OP;
      this.log = NO_OP;
      return;
    }

    this.warn = console.warn.bind(console);

    if (level === 'warn') {
      this.log = NO_OP;
      return;
    }

    this.log = console.log.bind(console);
  }
}

const LOG_LEVEL: LogLevel = ENV.ENVIRONMENT === 'production' ? 'warn' : 'log';

export const logger = new ConsoleLogger({ level: LOG_LEVEL });
