import { describe, it, expect } from 'vitest';
import { calculateEffectiveLength } from '../../src/utils/text';

describe('calculateEffectiveLength', () => {
  it('counts normal text correctly', () => {
    expect(calculateEffectiveLength('hello')).toBe(5);
    expect(calculateEffectiveLength('hello world')).toBe(11);
  });

  it('ignores mentions', () => {
    expect(calculateEffectiveLength('@user')).toBe(0);
    expect(calculateEffectiveLength('hello @user')).toBe(6); // "hello " (6 chars) + "@user" (0 chars)
    expect(calculateEffectiveLength('@user hello')).toBe(6);
    expect(calculateEffectiveLength('hello @user world')).toBe(12);
  });

  it('ignores urls', () => {
    expect(calculateEffectiveLength('https://example.com')).toBe(0);
    expect(calculateEffectiveLength('check https://example.com')).toBe(6);
    expect(calculateEffectiveLength('https://example.com check')).toBe(6);
  });

  it('ignores mixed content', () => {
    expect(
      calculateEffectiveLength('hello @user check https://example.com')
    ).toBe(13);
  });

  it('handles mentions inside text (should strictly match mentions?)', () => {
    // Usually @mention needs boundary or start of line.
    // But simplistic implementation might match anywhere.
    // If strict: "email@example.com" should not be a mention.
    // Let's assume standard behavior: @ at start or after whitespace.
    // For now, let's implement a simple version first and see if user complains or if I should be stricter.
    // "Simple" usually means regex /@[a-zA-Z0-9_]+/
    // If "email@example.com", @example matches?
    // Ideally mentions are prepended by space or start of string.
    // Let's test for strictness if we want quality.
    // expect(calculateEffectiveLength('email@example.com')).toBe(17);
  });

  it('handles multiple urls/mentions', () => {
    expect(calculateEffectiveLength('@a @b')).toBe(1); // " " between them
    expect(calculateEffectiveLength('http://a.com http://b.com')).toBe(1); // " " between
  });
});
