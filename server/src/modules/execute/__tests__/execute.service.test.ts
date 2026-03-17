import { beforeEach, describe, expect, mock, test } from 'bun:test';

import { UpstreamError } from '@/common/utils/api-errors';
import type { SearchParams } from '@/modules/execute/execute.types';
import type { FoursquarePlace } from '@/services/foursquare';

// ─── Mock modules BEFORE importing the service ──────────────────────

const mockParseMessage = mock<(message: string) => Promise<SearchParams>>();
const mockParseMessageHeuristic =
  mock<(message: string) => Promise<SearchParams>>();
const mockSearchRestaurants =
  mock<(params: SearchParams, ll?: string) => Promise<FoursquarePlace[]>>();

mock.module('@/services/llm', () => ({
  parseMessage: mockParseMessage,
  parseMessageHeuristic: mockParseMessageHeuristic,
}));

mock.module('@/services/foursquare', () => ({
  searchRestaurants: mockSearchRestaurants,
}));

// Import AFTER mocking
const { executeSearch } = await import('@/modules/execute/execute.service');

// ─── Helpers ─────────────────────────────────────────────────────────

const makeLLMResult = (
  overrides: Partial<SearchParams> = {},
): SearchParams => ({
  query: 'sushi',
  near: 'Los Angeles',
  min_price: null,
  max_price: null,
  open_now: false,
  is_food_related: true,
  ...overrides,
});

const makeFoursquarePlace = (
  overrides: Partial<FoursquarePlace> = {},
): FoursquarePlace => ({
  fsq_place_id: 'test-id-123',
  name: 'Test Restaurant',
  location: {
    formatted_address: '123 Test St, LA',
  },
  categories: [
    {
      name: 'Sushi',
      icon: {
        prefix: 'https://ss3.4sqi.net/img/categories_v2/food/sushi_',
        suffix: '.png',
      },
    },
  ],
  distance: 500,
  latitude: 34.0522,
  longitude: -118.2437,
  link: 'https://foursquare.com/v/test',
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────

beforeEach(() => {
  mockParseMessage.mockReset();
  mockParseMessageHeuristic.mockReset();
  mockSearchRestaurants.mockReset();
});

describe('executeSearch — location priority chain', () => {
  test('uses LLM near when present (ignores ll)', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult({ near: 'Makati City' }));
    mockSearchRestaurants.mockResolvedValue([makeFoursquarePlace()]);

    const result = await executeSearch('sushi near Makati', '14.5,121.0');

    // Foursquare should be called WITHOUT ll since LLM near is present
    expect(mockSearchRestaurants).toHaveBeenCalledWith(
      expect.objectContaining({ near: 'Makati City' }),
      undefined,
    );
    expect(result.results.length).toBe(1);
  });

  test('falls back to browser ll when LLM near is empty', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult({ near: '' }));
    mockSearchRestaurants.mockResolvedValue([makeFoursquarePlace()]);

    await executeSearch('sushi', '14.5547,121.0244');

    // Foursquare should be called WITH ll since near is empty
    expect(mockSearchRestaurants).toHaveBeenCalledWith(
      expect.objectContaining({ near: '' }),
      '14.5547,121.0244',
    );
  });

  test('throws MISSING_LOCATION when no near, no ll, and private IP', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult({ near: '' }));

    try {
      await executeSearch('sushi', undefined, '127.0.0.1');
      expect.unreachable('should have thrown');
    } catch (error: unknown) {
      const err = error as { meta?: { reason: string } };
      expect(err.meta?.reason).toBe('MISSING_LOCATION');
    }
  });
});

describe('executeSearch — result transformation', () => {
  test('transforms Foursquare place into clean client shape', async () => {
    const place = makeFoursquarePlace();
    mockParseMessage.mockResolvedValue(makeLLMResult());
    mockSearchRestaurants.mockResolvedValue([place]);

    const result = await executeSearch('sushi in LA');

    const restaurant = result.results[0];
    expect(restaurant).toEqual({
      id: 'test-id-123',
      name: 'Test Restaurant',
      address: '123 Test St, LA',
      categories: [
        {
          name: 'Sushi',
          icon: 'https://ss3.4sqi.net/img/categories_v2/food/sushi_64.png',
        },
      ],
      distance: 500,
      location: { lat: 34.0522, lng: -118.2437 },
      link: 'https://foursquare.com/v/test',
    });
  });

  test('handles missing fields with safe fallbacks', async () => {
    const place = makeFoursquarePlace({
      fsq_place_id: undefined,
      name: undefined,
      location: undefined,
      categories: undefined,
      distance: undefined,
      latitude: undefined,
      longitude: undefined,
      link: undefined,
    });
    mockParseMessage.mockResolvedValue(makeLLMResult());
    mockSearchRestaurants.mockResolvedValue([place]);

    const result = await executeSearch('sushi in LA');

    const restaurant = result.results[0];
    expect(restaurant.name).toBe('Unknown');
    expect(restaurant.address).toBe('Address unavailable');
    expect(restaurant.categories).toEqual([]);
    expect(restaurant.distance).toBeNull();
    expect(restaurant.location).toBeNull();
    expect(restaurant.link).toBeNull();
    // id should be a UUID (crypto.randomUUID)
    expect(restaurant.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test('returns correct meta', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult());
    mockSearchRestaurants.mockResolvedValue([
      makeFoursquarePlace(),
      makeFoursquarePlace({ fsq_place_id: 'id-2' }),
    ]);

    const result = await executeSearch('sushi in LA');

    expect(result.meta.resultCount).toBe(2);
    expect(result.meta.searchedAt).toBeTruthy();
    expect(result.meta.distanceLabel).toBeTruthy();
    expect(result.searchParams.query).toBe('sushi');
  });

  test('empty Foursquare results return empty array', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult());
    mockSearchRestaurants.mockResolvedValue([]);

    const result = await executeSearch('sushi in LA');

    expect(result.results).toEqual([]);
    expect(result.meta.resultCount).toBe(0);
  });
});

describe('executeSearch — distanceLabel', () => {
  test('returns "away from {city}" when LLM near is used', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult({ near: 'La Union' }));
    mockSearchRestaurants.mockResolvedValue([makeFoursquarePlace()]);

    const result = await executeSearch('burgers in La Union');

    expect(result.meta.distanceLabel).toBe('away from La Union');
  });

  test('returns "away from you" when browser ll is used', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult({ near: '' }));
    mockSearchRestaurants.mockResolvedValue([makeFoursquarePlace()]);

    const result = await executeSearch('sushi', '14.55,121.02');

    expect(result.meta.distanceLabel).toBe('away from you');
  });
});

describe('executeSearch — heuristic fallback', () => {
  test('falls back to heuristic parser when LLM throws UpstreamError', async () => {
    mockParseMessage.mockRejectedValue(new UpstreamError('Gemini unavailable'));
    mockParseMessageHeuristic.mockResolvedValue(
      makeLLMResult({ query: 'sushi', near: 'Manila' }),
    );
    mockSearchRestaurants.mockResolvedValue([makeFoursquarePlace()]);

    const result = await executeSearch('sushi near Manila');

    expect(mockParseMessageHeuristic).toHaveBeenCalledWith('sushi near Manila');
    expect(result.meta.parsedBy).toBe('heuristic');
    expect(result.results.length).toBe(1);
  });

  test('sets parsedBy to "llm" when LLM succeeds', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult());
    mockSearchRestaurants.mockResolvedValue([makeFoursquarePlace()]);

    const result = await executeSearch('sushi in LA');

    expect(result.meta.parsedBy).toBe('llm');
  });
});

describe('executeSearch — placeholder location sanitization', () => {
  test('strips "current location" and uses browser ll instead', async () => {
    mockParseMessage.mockResolvedValue(
      makeLLMResult({ near: 'current location' }),
    );
    mockSearchRestaurants.mockResolvedValue([makeFoursquarePlace()]);

    await executeSearch('sushi near me', '14.55,121.02');

    // near was sanitized → Foursquare should receive ll fallback
    expect(mockSearchRestaurants).toHaveBeenCalledWith(
      expect.objectContaining({ near: '' }),
      '14.55,121.02',
    );
  });

  test('strips "near me" and uses browser ll instead', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult({ near: 'near me' }));
    mockSearchRestaurants.mockResolvedValue([makeFoursquarePlace()]);

    await executeSearch('pizza near me', '40.71,-74.00');

    expect(mockSearchRestaurants).toHaveBeenCalledWith(
      expect.objectContaining({ near: '' }),
      '40.71,-74.00',
    );
  });

  test('throws MISSING_LOCATION if placeholder stripped and no ll', async () => {
    mockParseMessage.mockResolvedValue(makeLLMResult({ near: 'my location' }));

    try {
      await executeSearch('sushi', undefined, '127.0.0.1');
      expect.unreachable('should have thrown');
    } catch (error: unknown) {
      const err = error as { meta?: { reason: string } };
      expect(err.meta?.reason).toBe('MISSING_LOCATION');
    }
  });
});
