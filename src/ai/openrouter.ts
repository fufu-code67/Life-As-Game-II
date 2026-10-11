/**
 * OpenRouter client — single call per case, no streaming, no retries here
 * (caller handles fallback model). Key from env, never hardcoded.
 */
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

export interface OpenRouterOptions {
  model: string;
  system: string;
  user: string;
  /** Strict JSON expected in response. */
  json: boolean;
  timeoutMs?: number;
}

export class AiRequestError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(`AiRequestError: ${message}`);
    this.name = 'AiRequestError';
  }
}

/** Raw single completion. Throws AiRequestError on any failure. */
export async function openRouterComplete(opts: OpenRouterOptions, apiKey: string): Promise<string> {
  const body: Record<string, unknown> = {
    model: opts.model,
    messages: [
      { role: 'system', content: opts.system },
      { role: 'user', content: opts.user },
    ],
  };
  if (opts.json) {
    body.response_format = { type: 'json_object' };
  }
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 15000);
  let res: Response;
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    throw new AiRequestError(`network error: ${String(e)}`);
  }
  clearTimeout(timer);
  if (!res.ok) {
    throw new AiRequestError(`openrouter ${res.status}`, res.status);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new AiRequestError('empty completion');
  return content;
}
