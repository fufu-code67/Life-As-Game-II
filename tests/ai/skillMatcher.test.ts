/**
 * Skill matcher tests — contract: src/ai/skillMatcher.ts
 * AI is ALWAYS mocked here (per docs/ARCHITECTURE.md test strategy).
 */
import { describe, it, expect, vi } from 'vitest';
import { matchQuestToSkill, type MatcherDeps } from '../../src/ai/skillMatcher';
import { AiRequestError } from '../../src/ai/openrouter';

function deps(overrides: Partial<MatcherDeps> = {}): MatcherDeps {
  return {
    skills: [
      { id: 's1', name: 'Fitness' },
      { id: 's2', name: 'Programming' },
    ],
    apiKey: 'test-key',
    ...overrides,
  };
}

describe('matchQuestToSkill', () => {
  it('level 1: exact normalized match returns existing skill without AI call', async () => {
    const complete = vi.fn();
    const out = await matchQuestToSkill('FITNESS!', 'go for a run', deps({ complete }));
    expect(out).toEqual({ ok: true, existingSkillId: 's1' });
    expect(complete).not.toHaveBeenCalled();
  });

  it('level 2: AI picks an existing skill', async () => {
    const complete = vi.fn().mockResolvedValue(
      JSON.stringify({ existingSkillId: 's2' }),
    );
    const out = await matchQuestToSkill(
      'Refactor the parser',
      'clean up code',
      deps({ complete }),
    );
    expect(out).toEqual({ ok: true, existingSkillId: 's2' });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('level 2: AI proposes a new skill, name gets normalized', async () => {
    const complete = vi.fn().mockResolvedValue(
      JSON.stringify({
        existingSkillId: null,
        newSkill: { name: '  healthy cooking!! ', attribute: 'craft', description: 'cooking meals', icon: 'pot' },
      }),
    );
    const out = await matchQuestToSkill('Cook dinner', 'veggies', deps({ complete }));
    expect(out).toEqual({
      ok: true,
      newSkill: { name: 'Healthy Cooking', attribute: 'craft', description: 'cooking meals', icon: 'pot' },
    });
  });

  it('AI inventing an unknown skill id → falls through to fallback model / fails safely', async () => {
    const complete = vi.fn().mockResolvedValue(
      JSON.stringify({ existingSkillId: 'ghost-id' }),
    );
    const out = await matchQuestToSkill('Some task', 'desc', deps({ complete }));
    expect(out).toEqual({ ok: false, reason: 'all models failed' });
    expect(complete).toHaveBeenCalledTimes(2); // primary + fallback
  });

  it('broken JSON from AI → tries fallback model, then safe failure', async () => {
    const complete = vi.fn().mockResolvedValue('this is not json {{{');
    const out = await matchQuestToSkill('Some task', 'desc', deps({ complete }));
    expect(out).toEqual({ ok: false, reason: 'all models failed' });
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('network error on primary → fallback model succeeds', async () => {
    const complete = vi
      .fn()
      .mockRejectedValueOnce(new AiRequestError('network error'))
      .mockResolvedValueOnce(JSON.stringify({ existingSkillId: 's1' }));
    const out = await matchQuestToSkill('Run 5k', 'cardio', deps({ complete }));
    expect(out).toEqual({ ok: true, existingSkillId: 's1' });
    expect(complete).toHaveBeenCalledTimes(2);
  });

  it('401 auth error → aborts immediately, no fallback call', async () => {
    const complete = vi.fn().mockRejectedValue(new AiRequestError('openrouter 401', 401));
    const out = await matchQuestToSkill('Some task', 'desc', deps({ complete }));
    expect(out).toEqual({ ok: false, reason: 'auth' });
    expect(complete).toHaveBeenCalledTimes(1);
  });

  it('newSkill with unknown attribute fails zod validation → safe failure', async () => {
    const complete = vi.fn().mockResolvedValue(
      JSON.stringify({
        existingSkillId: null,
        newSkill: { name: 'X', attribute: 'charisma', description: 'x', icon: 'x' },
      }),
    );
    const out = await matchQuestToSkill('Some task', 'desc', deps({ complete }));
    expect(out).toEqual({ ok: false, reason: 'all models failed' });
  });
});
