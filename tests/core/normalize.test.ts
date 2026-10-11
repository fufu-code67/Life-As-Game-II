/**
 * Tests for normalizeSkillName contract (ai/normalize.ts).
 * Contract rules:
 *   1. Trim whitespace
 *   2. Strip punctuation
 *   3. Max 2 words (drop extras)
 *   4. TitleCase output
 *
 * The implementation is being built in parallel; these tests validate
 * the contract surface so the implementer knows exactly what to satisfy.
 */
import { describe, it, expect } from 'vitest';
import { normalizeSkillName } from '../../src/ai/normalize';

describe('normalizeSkillName', () => {
  it('trims leading and trailing whitespace', () => {
    expect(normalizeSkillName('  hello  ')).toBe('Hello');
  });

  it('strips punctuation characters', () => {
    expect(normalizeSkillName('hello, world!!!')).toBe('Hello World');
  });

  it('limits output to at most 2 words', () => {
    expect(normalizeSkillName('very long title here')).toBe('Very Long');
  });

  it('produces TitleCase for a single word', () => {
    expect(normalizeSkillName('BOOKS')).toBe('Books');
  });

  it('produces TitleCase for two words', () => {
    expect(normalizeSkillName('language learning')).toBe('Language Learning');
  });

  it('handles mixed-case input with punctuation and extra words', () => {
    expect(normalizeSkillName('  hello, world!!! ')).toBe('Hello World');
  });

  it('handles a single word with surrounding punctuation', () => {
    expect(normalizeSkillName('--fitness--')).toBe('Fitness');
  });

  it('handles empty string gracefully (returns empty)', () => {
    // Contract: trimming + stripping punctuation on empty yields empty
    const result = normalizeSkillName('');
    expect(result).toBe('');
  });

  it('handles whitespace-only string gracefully (returns empty)', () => {
    const result = normalizeSkillName('   ');
    expect(result).toBe('');
  });

  it('drops words beyond the first two', () => {
    expect(normalizeSkillName('one two three four')).toBe('One Two');
  });

  it('normalises all-caps two-word input', () => {
    expect(normalizeSkillName('SLEEP HYGIENE')).toBe('Sleep Hygiene');
  });

  it('removes punctuation between words but preserves word boundary', () => {
    // "hello,world" → after stripping punctuation becomes "helloworld" (one word)
    // vs "hello, world" → "hello world" (two words)
    expect(normalizeSkillName('hello,world')).toBe('Helloworld');
  });
});
