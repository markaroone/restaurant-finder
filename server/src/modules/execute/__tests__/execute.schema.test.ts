import { describe, expect, test } from 'bun:test';

import { env } from '@/config/env';
import {
  executeQuerySchema,
  searchParamsSchema,
} from '@/modules/execute/execute.schema';

// ─── executeQuerySchema ──────────────────────────────────────────────

describe('executeQuerySchema', () => {
  test('accepts a valid message', () => {
    const result = executeQuerySchema.safeParse({
      query: { message: 'sushi in LA', code: env.API_ACCESS_CODE },
    });
    expect(result.success).toBe(true);
  });

  test('accepts message with ll param', () => {
    const result = executeQuerySchema.safeParse({
      query: {
        message: 'ramen near me',
        code: env.API_ACCESS_CODE,
        ll: '14.5547,121.0244',
      },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query.ll).toBe('14.5547,121.0244');
    }
  });

  test('rejects empty message', () => {
    const result = executeQuerySchema.safeParse({
      query: { message: '', code: env.API_ACCESS_CODE },
    });
    expect(result.success).toBe(false);
  });

  test('rejects single-character message (min 2)', () => {
    const result = executeQuerySchema.safeParse({
      query: { message: 'a', code: env.API_ACCESS_CODE },
    });
    expect(result.success).toBe(false);
  });

  test('accepts two-character message', () => {
    const result = executeQuerySchema.safeParse({
      query: { message: 'hi', code: env.API_ACCESS_CODE },
    });
    expect(result.success).toBe(true);
  });

  test('rejects message over 500 chars', () => {
    const result = executeQuerySchema.safeParse({
      query: { message: 'x'.repeat(501), code: env.API_ACCESS_CODE },
    });
    expect(result.success).toBe(false);
  });

  test('rejects missing message', () => {
    const result = executeQuerySchema.safeParse({
      query: { code: env.API_ACCESS_CODE },
    });
    expect(result.success).toBe(false);
  });

  test('rejects invalid ll format', () => {
    const result = executeQuerySchema.safeParse({
      query: { message: 'ramen', code: env.API_ACCESS_CODE, ll: 'not-coords' },
    });
    expect(result.success).toBe(false);
  });

  test('accepts ll with negative coordinates', () => {
    const result = executeQuerySchema.safeParse({
      query: {
        message: 'tacos',
        code: env.API_ACCESS_CODE,
        ll: '-33.8688,151.2093',
      },
    });
    expect(result.success).toBe(true);
  });

  test('ll is optional — omitting it is valid', () => {
    const result = executeQuerySchema.safeParse({
      query: { message: 'pizza in NYC', code: env.API_ACCESS_CODE },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query.ll).toBeUndefined();
    }
  });
});

// ─── searchParamsSchema ──────────────────────────────────────────────

describe('searchParamsSchema', () => {
  test('parses a fully valid object', () => {
    const result = searchParamsSchema.safeParse({
      query: 'sushi',
      near: 'Los Angeles',
      min_price: 2,
      max_price: 3,
      open_now: true,

      is_food_related: true,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        query: 'sushi',
        near: 'Los Angeles',
        min_price: 2,
        max_price: 3,
        open_now: true,

        is_food_related: true,
      });
    }
  });

  test('fills defaults for minimal input', () => {
    const result = searchParamsSchema.safeParse({
      query: 'ramen',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.near).toBe('');
      expect(result.data.min_price).toBeNull();
      expect(result.data.max_price).toBeNull();
      expect(result.data.open_now).toBe(false);

      expect(result.data.is_food_related).toBe(true);
    }
  });

  test('rejects empty query', () => {
    const result = searchParamsSchema.safeParse({
      query: '',
    });
    expect(result.success).toBe(false);
  });

  test('rejects min_price out of range (too high)', () => {
    const result = searchParamsSchema.safeParse({
      query: 'pizza',
      min_price: 7,
      max_price: 7,
    });
    expect(result.success).toBe(false);
  });

  test('rejects min_price out of range (zero)', () => {
    const result = searchParamsSchema.safeParse({
      query: 'pizza',
      min_price: 0,
      max_price: 0,
    });
    expect(result.success).toBe(false);
  });

  test('accepts null price fields', () => {
    const result = searchParamsSchema.safeParse({
      query: 'pizza',
      min_price: null,
      max_price: null,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.min_price).toBeNull();
      expect(result.data.max_price).toBeNull();
    }
  });

  test('rejects min_price > max_price', () => {
    const result = searchParamsSchema.safeParse({
      query: 'pizza',
      min_price: 3,
      max_price: 1,
    });
    expect(result.success).toBe(false);
  });

  test('is_food_related defaults to true', () => {
    const result = searchParamsSchema.safeParse({
      query: 'burger',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_food_related).toBe(true);
    }
  });

  test('accepts is_food_related = false', () => {
    const result = searchParamsSchema.safeParse({
      query: 'gas station',
      is_food_related: false,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.is_food_related).toBe(false);
    }
  });
});
