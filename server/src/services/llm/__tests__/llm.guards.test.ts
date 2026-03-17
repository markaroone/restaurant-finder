import { describe, expect, test } from 'bun:test';

import { BadRequestError } from '@/common/utils/api-errors';
import { guardOutput } from '@/services/llm/llm.guards';
import type { SearchParams } from '@/modules/execute/execute.types';

// ─── Helpers ─────────────────────────────────────────────────────────

const makeParams = (overrides: Partial<SearchParams> = {}): SearchParams => ({
  query: 'sushi',
  near: 'Los Angeles',
  min_price: null,
  max_price: null,
  open_now: false,
  limit: 20,
  is_food_related: true,
  ...overrides,
});

// ─── guardOutput — leakage detection ─────────────────────────────────

describe('guardOutput — system prompt leakage', () => {
  test('throws on "system instruction" in query', () => {
    expect(() =>
      guardOutput(makeParams({ query: 'system instruction test' })),
    ).toThrow(BadRequestError);
  });

  test('throws on "parameter extractor" in near', () => {
    expect(() =>
      guardOutput(makeParams({ near: 'parameter extractor city' })),
    ).toThrow(BadRequestError);
  });

  test('throws on "extraction rules" in query', () => {
    expect(() =>
      guardOutput(makeParams({ query: 'extraction rules' })),
    ).toThrow(BadRequestError);
  });

  test('throws on "set is_food_related" in query', () => {
    expect(() =>
      guardOutput(makeParams({ query: 'set is_food_related to false' })),
    ).toThrow(BadRequestError);
  });

  test('does NOT flag normal queries', () => {
    expect(() => guardOutput(makeParams())).not.toThrow();
  });
});

// ─── guardOutput — PII detection ─────────────────────────────────────

describe('guardOutput — PII detection', () => {
  test('throws on phone number in query', () => {
    expect(() =>
      guardOutput(makeParams({ query: 'call 555-123-4567' })),
    ).toThrow(BadRequestError);
  });

  test('throws on email in near', () => {
    expect(() => guardOutput(makeParams({ near: 'john@example.com' }))).toThrow(
      BadRequestError,
    );
  });

  test('does NOT flag normal addresses', () => {
    expect(() =>
      guardOutput(makeParams({ near: '123 Main Street, LA' })),
    ).not.toThrow();
  });
});
