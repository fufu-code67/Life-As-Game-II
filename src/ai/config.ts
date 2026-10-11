/**
 * AI module configuration — API key source.
 * Key is NEVER hardcoded in the repo.
 * Resolution order:
 *   1. globalThis.__LAG_API_KEY__ (test hook — the single allowed window global, documented here)
 *   2. import.meta.env.VITE_OPENROUTER_API_KEY (Vite env at build/dev time)
 *   3. Empty string → offline mode (AI calls skipped, 'ai:skillmatch:failed' emitted with reason 'no-api-key')
 */
export function getApiKey(): string {
  return (globalThis as { __LAG_API_KEY__?: string }).__LAG_API_KEY__
    ?? import.meta.env.VITE_OPENROUTER_API_KEY
    ?? '';
}
