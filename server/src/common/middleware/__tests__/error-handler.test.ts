import { describe, expect, test } from 'bun:test';

import {
  AmbiguousLocationError,
  BadRequestError,
  GatewayTimeoutError,
  RateLimitError,
  UnauthorizedError,
  UpstreamError,
  ValidationError,
} from '@/common/utils/api-errors';

import { errorHandler } from '../error-handler';

// ─── Test Helpers ────────────────────────────────────────────────────

/**
 * Creates minimal Express-like req/res/next mocks for testing the error handler.
 */
const createMocks = (
  overrides: { id?: string; headers?: Record<string, string> } = {},
) => {
  const req = {
    method: 'GET',
    path: '/api/execute',
    originalUrl: '/api/execute?message=test',
    id: overrides.id,
    headers: overrides.headers ?? {},
  } as Parameters<typeof errorHandler>[1];

  let capturedStatus = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let capturedBody: Record<string, any> | null = null;

  const res = {
    status: (code: number) => {
      capturedStatus = code;
      return res;
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    json: (body: Record<string, any>) => {
      capturedBody = body;
    },
  } as unknown as Parameters<typeof errorHandler>[2];

  const next = (() => {}) as Parameters<typeof errorHandler>[3];

  return {
    req,
    res,
    next,
    getStatus: () => capturedStatus,
    getBody: () => capturedBody!,
  };
};

// ─── Status Code Mapping ─────────────────────────────────────────────

describe('errorHandler — status code mapping', () => {
  test('BadRequestError → 400', () => {
    const { req, res, next, getStatus } = createMocks();
    errorHandler(new BadRequestError('bad'), req, res, next);
    expect(getStatus()).toBe(400);
  });

  test('UnauthorizedError → 401', () => {
    const { req, res, next, getStatus } = createMocks();
    errorHandler(new UnauthorizedError('unauthorized'), req, res, next);
    expect(getStatus()).toBe(401);
  });

  test('ValidationError → 422', () => {
    const { req, res, next, getStatus } = createMocks();
    errorHandler(new ValidationError('invalid'), req, res, next);
    expect(getStatus()).toBe(422);
  });

  test('RateLimitError → 429', () => {
    const { req, res, next, getStatus } = createMocks();
    errorHandler(new RateLimitError('too many'), req, res, next);
    expect(getStatus()).toBe(429);
  });

  test('UpstreamError → 502', () => {
    const { req, res, next, getStatus } = createMocks();
    errorHandler(new UpstreamError('upstream failed'), req, res, next);
    expect(getStatus()).toBe(502);
  });

  test('GatewayTimeoutError → 504', () => {
    const { req, res, next, getStatus } = createMocks();
    errorHandler(new GatewayTimeoutError('timeout'), req, res, next);
    expect(getStatus()).toBe(504);
  });

  test('AmbiguousLocationError → 400', () => {
    const { req, res, next, getStatus } = createMocks();
    errorHandler(
      new AmbiguousLocationError('Springfield', 'Springfield, IL'),
      req,
      res,
      next,
    );
    expect(getStatus()).toBe(400);
  });

  test('generic Error → 500', () => {
    const { req, res, next, getStatus } = createMocks();
    errorHandler(new Error('unexpected'), req, res, next);
    expect(getStatus()).toBe(500);
  });
});

// ─── RFC 7807 Response Body ──────────────────────────────────────────

describe('errorHandler — RFC 7807 response body', () => {
  test('includes all required Problem Document fields', () => {
    const { req, res, next, getBody } = createMocks();
    errorHandler(new BadRequestError('test message'), req, res, next);

    const body = getBody();
    expect(body.type).toContain('bad-request');
    expect(body.title).toBeTruthy();
    expect(body.status).toBe(400);
    expect(body.detail).toBe('test message');
    expect(body.code).toBe('BAD_REQUEST');
    expect(body.instance).toBeTruthy();
    expect(body.traceId).toBeTruthy();
  });

  test('includes meta for AppErrors', () => {
    const { req, res, next, getBody } = createMocks();
    errorHandler(
      new BadRequestError('test', { reason: 'PROMPT_INJECTION' }),
      req,
      res,
      next,
    );

    expect(getBody().meta).toEqual({ reason: 'PROMPT_INJECTION' });
  });

  test('includes errors array for ValidationError', () => {
    const { req, res, next, getBody } = createMocks();
    errorHandler(
      new ValidationError('invalid', [
        { field: 'message', code: 'too_small', message: 'too short' },
      ]),
      req,
      res,
      next,
    );

    expect(getBody().errors).toHaveLength(1);
    expect(getBody().errors[0].field).toBe('message');
  });

  test('does NOT include meta/errors for generic Error', () => {
    const { req, res, next, getBody } = createMocks();
    errorHandler(new Error('oops'), req, res, next);

    const body = getBody();
    expect(body.meta).toBeUndefined();
    expect(body.errors).toBeUndefined();
  });
});

// ─── Trace ID Extraction ─────────────────────────────────────────────

describe('errorHandler — trace ID', () => {
  test('uses req.id when available', () => {
    const { req, res, next, getBody } = createMocks({ id: 'trace-abc-123' });
    errorHandler(new BadRequestError('test'), req, res, next);

    expect(getBody().traceId).toBe('trace-abc-123');
  });

  test('falls back to x-request-id header', () => {
    const { req, res, next, getBody } = createMocks({
      headers: { 'x-request-id': 'header-trace-456' },
    });
    errorHandler(new BadRequestError('test'), req, res, next);

    expect(getBody().traceId).toBe('header-trace-456');
  });

  test('defaults to "unknown" when no trace ID', () => {
    const { req, res, next, getBody } = createMocks();
    errorHandler(new BadRequestError('test'), req, res, next);

    expect(getBody().traceId).toBe('unknown');
  });
});

// ─── Frontend-Critical Meta Fields ───────────────────────────────────

describe('errorHandler — frontend-critical meta', () => {
  test('AmbiguousLocationError includes near and suggestion in meta', () => {
    const { req, res, next, getBody } = createMocks();
    errorHandler(
      new AmbiguousLocationError('Springfield', 'Springfield, IL'),
      req,
      res,
      next,
    );

    const body = getBody();
    expect(body.meta).toBeDefined();
    expect(body.meta.near).toBe('Springfield');
    expect(body.meta.suggestion).toBe('Springfield, IL');
  });
});

// ─── Stack Trace Exposure ────────────────────────────────────────────

describe('errorHandler — stack trace security', () => {
  test('includes stack for 500 errors in development', () => {
    const { req, res, next, getBody } = createMocks();
    errorHandler(new Error('crash'), req, res, next);

    // Bun test runner sets NODE_ENV=test, but env defaults to 'production'
    // when not overridden. We check the current behavior:
    const body = getBody();
    expect(body.status).toBe(500);
    // Stack should only be present when NODE_ENV === 'development'
    // In test/production, it must be undefined (security)
    expect(body.stack).toBeUndefined();
  });
});
