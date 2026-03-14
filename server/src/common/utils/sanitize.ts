/**
 * Strips characters that add no semantic value and confuse both the LLM
 * and downstream APIs. Runs before the message hits Gemini.
 *
 * Removes:
 * - Combining diacritical marks (Zalgo)       U+0300–U+036F, U+0489
 * - Zero-width characters (ZWSP, ZWNJ, ZWJ)  U+200B–U+200D, U+FEFF
 * - Null bytes                                U+0000
 * - Variation selectors                       U+FE00–U+FE0F
 *
 * Does NOT remove:
 * - Emojis (they carry semantic meaning)
 * - Non-Latin scripts (Arabic, CJK, Cyrillic — all valid)
 * - Standard diacritics (é, ñ, ü — part of real words)
 */
export const sanitizeUnicode = (input: string): string => {
  return input
    .replace(/[\u0300-\u036F\u0489]/g, '') // combining marks (Zalgo)
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/\u0000/g, '') // null bytes
    .replace(/[\uFE00-\uFE0F]/g, '') // variation selectors
    .replace(/\s+/g, ' ') // collapse whitespace
    .trim();
};
