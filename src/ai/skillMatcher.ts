/**
 * Skill matching pipeline (Phase 3, spec §9):
 * 1. Exact normalized-name match against existing skills.
 * 2. Else ONE AI call: pick existing skill or propose a new one.
 * 3. Names normalized: 1-2 words, TitleCase, no punctuation.
 * 4. No hardcoded keyword rules — the AI decides.
 * 5. No confirmation dialog; only a toast. AI failure → safe fallback:
 *    quest stays valid, skill mapping deferred.
 */
import { z } from 'zod';
import { openRouterComplete, AiRequestError } from './openrouter';
import { normalizeSkillName } from './normalize';

export const AI_MODELS = {
  primary: 'z-ai/glm-5.3-flash',
  fallback: 'moonshotai/kimi-k3',
} as const;

const responseSchema = z.object({
  existingSkillId: z.string().nullable(),
  newSkill: z
    .object({
      name: z.string(),
      attribute: z.enum(['body', 'mind', 'spirit', 'craft']),
      description: z.string().max(200),
      icon: z.string().max(32),
    })
    .optional(),
});

export interface MatcherDeps {
  /** Existing skills: id + normalized name. */
  skills: ReadonlyArray<{ id: string; name: string }>;
  apiKey: string;
  /** Injectable for tests — default: real openRouterComplete. */
  complete?: typeof openRouterComplete;
  models?: { primary: string; fallback: string };
}

export type SkillMatchOutcome =
  | { ok: true; existingSkillId: string }
  | { ok: true; newSkill: { name: string; attribute: 'body' | 'mind' | 'spirit' | 'craft'; description: string; icon: string } }
  | { ok: false; reason: string };

export async function matchQuestToSkill(
  title: string,
  description: string,
  deps: MatcherDeps,
): Promise<SkillMatchOutcome> {
  // Level 1: exact normalized match
  const normTitle = normalizeSkillName(title);
  const exact = deps.skills.find((s) => normalizeSkillName(s.name) === normTitle);
  if (exact) return { ok: true, existingSkillId: exact.id };

  // Level 2: single AI call with fallback model chain
  const complete = deps.complete ?? openRouterComplete;
  const models = deps.models ?? AI_MODELS;
  const system =
    'You map a personal task to a skill for a gamified life planner. ' +
    'Respond ONLY with JSON: {"existingSkillId": string|null, "newSkill": ' +
    '{"name": string (1-2 words TitleCase), "attribute": "body"|"mind"|"spirit"|"craft", ' +
    '"description": string (max 200 chars), "icon": string (short icon key)}}. ' +
    'If one of the existing skills fits, set existingSkillId and omit newSkill. ' +
    'Otherwise set existingSkillId=null and fill newSkill. Never invent ids.';
  const user =
    `Existing skills (id: name): ${deps.skills.map((s) => `${s.id}: ${s.name}`).join(', ')}. ` +
    `Task: "${title}" — ${description}`;

  for (const model of [models.primary, models.fallback]) {
    try {
      const raw = await complete(
        { model, system, user, json: true, timeoutMs: 15000 },
        deps.apiKey,
      );
      const parsed = responseSchema.safeParse(JSON.parse(raw));
      if (!parsed.success) {
        continue; // invalid shape → try fallback model
      }
      const v = parsed.data;
      if (v.existingSkillId && deps.skills.some((s) => s.id === v.existingSkillId)) {
        return { ok: true, existingSkillId: v.existingSkillId };
      }
      if (v.existingSkillId === null && v.newSkill) {
        return {
          ok: true,
          newSkill: {
            ...v.newSkill,
            name: normalizeSkillName(v.newSkill.name),
          },
        };
      }
      continue;
    } catch (e) {
      if (e instanceof AiRequestError && e.status === 401) {
        return { ok: false, reason: 'auth' }; // do not hammer fallback on auth issues
      }
      continue;
    }
  }
  return { ok: false, reason: 'all models failed' };
}
