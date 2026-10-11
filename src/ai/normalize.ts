/**
 * Skill name normalization — pure function, no dependencies.
 * Contract: 1–2 words, TitleCase, no punctuation.
 */

/** Normalize a raw skill name: trim, strip punctuation, collapse whitespace, take max first 2 words, TitleCase each word. */
export function normalizeSkillName(raw: string): string {
  let s = raw.trim();
  // Strip punctuation (keep letters, digits, whitespace)
  s = s.replace(/[^\p{L}\p{N}\s]/gu, '');
  // Collapse whitespace
  s = s.replace(/\s+/g, ' ').trim();
  // Take max first 2 words
  const words = s.split(' ').slice(0, 2);
  // TitleCase each word
  return words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
