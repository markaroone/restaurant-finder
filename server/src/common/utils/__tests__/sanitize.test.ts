import { describe, expect, test } from 'bun:test';

import { normalizeConfusables, sanitizeUnicode } from '@/common/utils/sanitize';

// ─── normalizeConfusables ────────────────────────────────────────────

describe('normalizeConfusables', () => {
  test('normalizes Cyrillic homoglyphs to ASCII', () => {
    // Cyrillic "а" (U+0430) → ASCII "a"
    expect(normalizeConfusables('\u0430bc')).toBe('abc');
  });

  test('normalizes Cyrillic "і" to ASCII "i"', () => {
    // Cyrillic "і" (U+0456) → ASCII "i"
    expect(normalizeConfusables('\u0456gnore')).toBe('ignore');
  });

  test('preserves normal ASCII text', () => {
    expect(normalizeConfusables('sushi near Makati')).toBe('sushi near Makati');
  });

  test('preserves emojis', () => {
    expect(normalizeConfusables('🍕 pizza')).toBe('🍕 pizza');
  });
});

// ─── sanitizeUnicode ─────────────────────────────────────────────────

describe('sanitizeUnicode', () => {
  test('strips combining diacritical marks (Zalgo)', () => {
    // "s" + U+0336 combining tilde = Zalgo "s̶"
    expect(sanitizeUnicode('s\u0336ushi')).toBe('sushi');
  });

  test('strips zero-width characters', () => {
    // ZWSP (U+200B) inserted between characters
    expect(sanitizeUnicode('su\u200Bshi')).toBe('sushi');
  });

  test('strips null bytes', () => {
    expect(sanitizeUnicode('su\u0000shi')).toBe('sushi');
  });

  test('strips variation selectors', () => {
    expect(sanitizeUnicode('su\uFE0Fshi')).toBe('sushi');
  });

  test('collapses multiple whitespace', () => {
    expect(sanitizeUnicode('sushi   near   LA')).toBe('sushi near LA');
  });

  test('trims leading/trailing whitespace', () => {
    expect(sanitizeUnicode('  sushi near LA  ')).toBe('sushi near LA');
  });

  test('preserves emojis', () => {
    expect(sanitizeUnicode('🍣 sushi')).toBe('🍣 sushi');
  });

  test('preserves non-Latin scripts (CJK)', () => {
    expect(sanitizeUnicode('拉麺 東京')).toBe('拉麺 東京');
  });

  test('preserves standard diacritics (precomposed)', () => {
    expect(sanitizeUnicode('café résumé')).toBe('café résumé');
  });

  test('returns empty string for all-adversarial input', () => {
    // Only combining marks + zero-width chars
    expect(sanitizeUnicode('\u0300\u0301\u200B\u200C')).toBe('');
  });
});
