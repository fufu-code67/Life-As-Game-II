/**
 * Tests for XpService contract (core/services.ts XpService).
 *
 * Contract rules (from data/quests.ts + types.ts + DECISIONS.md):
 *   - Base XP: easy=10, normal=25, hard=50
 *   - Boss base XP: 120
 *   - Streak multiplier: +10% per day, capped at +100%
 *   - computeXp is a pure function
 *   - applySkillXp: adds xp, checks skillLevelXpThreshold for level-up,
 *     emits skill:xp and skill:levelup
 *   - skillLevelXpThreshold(level) = 50 + (level-1)*75
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, db } from '../../src/core/db';
import { createEventBus } from '../../src/core/eventBus';
import { QUEST_XP, BOSS_XP_BASE, STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP } from '../../src/data/quests';
import { skillLevelXpThreshold } from '../../src/core/types';
import type { Skill, EventBus } from '../../src/core/types';

/**
 * Import the service factory. Implementation is in-flight; type errors
 * for missing modules are acceptable per task spec.
 */
import { createXpService } from '../../src/core/xp';

let bus: EventBus;
let xpService: {
  computeXp(difficulty: 'easy' | 'normal' | 'hard', streakCurrent: number, isBoss?: boolean): number;
  applySkillXp(skillId: string, xp: number): Promise<Skill>;
};
let emitted: { name: string; payload: unknown }[];

beforeEach(() => {
  const dbName = `lag_test_xp_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  initDb(dbName);
  bus = createEventBus();
  emitted = [];

  bus.on('skill:xp', (payload) => emitted.push({ name: 'skill:xp', payload }));
  bus.on('skill:levelup', (payload) => emitted.push({ name: 'skill:levelup', payload }));

  xpService = createXpService(db, bus);
});

// ---------- computeXp (pure function) ----------

describe('computeXp', () => {
  it('easy base = 10 (no streak)', () => {
    expect(xpService.computeXp('easy', 0)).toBe(QUEST_XP.easy);
    expect(QUEST_XP.easy).toBe(10);
  });

  it('normal base = 25 (no streak)', () => {
    expect(xpService.computeXp('normal', 0)).toBe(QUEST_XP.normal);
    expect(QUEST_XP.normal).toBe(25);
  });

  it('hard base = 50 (no streak)', () => {
    expect(xpService.computeXp('hard', 0)).toBe(QUEST_XP.hard);
    expect(QUEST_XP.hard).toBe(50);
  });

  it('boss base = 120 (no streak)', () => {
    expect(xpService.computeXp('normal', 0, true)).toBe(BOSS_XP_BASE);
    expect(BOSS_XP_BASE).toBe(120);
  });

  it('streak multiplier: +10% per day', () => {
    // Streak of 5 → +50% bonus
    const base = QUEST_XP.normal; // 25
    const expected = Math.round(base * (1 + 5 * STREAK_BONUS_PER_DAY));
    expect(xpService.computeXp('normal', 5)).toBe(expected);
  });

  it('streak multiplier capped at +100%', () => {
    // Streak of 20 would be +200% without cap; should be capped at +100%
    const base = QUEST_XP.hard; // 50
    const expected = Math.round(base * (1 + STREAK_BONUS_CAP)); // 50 * 2 = 100
    expect(xpService.computeXp('hard', 20)).toBe(expected);
  });

  it('streak=1 gives +10% bonus', () => {
    const base = QUEST_XP.easy; // 10
    const expected = Math.round(base * 1.1); // 11
    expect(xpService.computeXp('easy', 1)).toBe(expected);
  });

  it('boss with streak applies multiplier to boss base', () => {
    // Boss + streak 3 → 120 * (1 + 0.3) = 120 * 1.3 = 156
    const expected = Math.round(BOSS_XP_BASE * (1 + 3 * STREAK_BONUS_PER_DAY));
    expect(xpService.computeXp('normal', 3, true)).toBe(expected);
  });

  it('streak=0 gives no bonus (multiplier = 1.0)', () => {
    expect(xpService.computeXp('easy', 0)).toBe(10);
    expect(xpService.computeXp('normal', 0)).toBe(25);
    expect(xpService.computeXp('hard', 0)).toBe(50);
  });
});

// ---------- applySkillXp ----------

describe('applySkillXp', () => {
  it('adds xp to skill and emits skill:xp', async () => {
    // Seed a skill into the DB first (implementation detail: need a skill row)
    const { db } = await import('../../src/core/db');
    const skillId = 'skill-test-1';
    await db.skills.put({
      id: skillId,
      name: 'Fitness',
      description: 'Physical exercise',
      attribute: 'body',
      icon: 'dumbbell',
      level: 1,
      xp: 0,
      createdAt: Date.now(),
    });

    const updated = await xpService.applySkillXp(skillId, 20);
    expect(updated.xp).toBe(20);
    expect(updated.level).toBe(1);

    const xpEvents = emitted.filter((e) => e.name === 'skill:xp');
    expect(xpEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('level-up crossing threshold emits skill:levelup', async () => {
    const { db } = await import('../../src/core/db');
    const skillId = 'skill-test-levelup';
    // L1→2 threshold = skillLevelXpThreshold(1) = 50
    // threshold value used implicitly via the level-up assertion below
    // Start with xp just below threshold
    await db.skills.put({
      id: skillId,
      name: 'Reading',
      description: 'Absorbing knowledge',
      attribute: 'mind',
      icon: 'book',
      level: 1,
      xp: 40,
      createdAt: Date.now(),
    });

    // Add enough XP to cross the threshold
    const updated = await xpService.applySkillXp(skillId, 20); // 40 + 20 = 60 > 50
    expect(updated.level).toBe(2);
    // Overflow XP: 60 - 50 = 10
    expect(updated.xp).toBe(10);

    const levelUpEvents = emitted.filter((e) => e.name === 'skill:levelup');
    expect(levelUpEvents.length).toBeGreaterThanOrEqual(1);
    const payload = levelUpEvents[0]!.payload as { skill: Skill; newLevel: number };
    expect(payload.newLevel).toBe(2);
  });

  it('multiple level-ups in one applySkillXp call', async () => {
    const { db } = await import('../../src/core/db');
    const skillId = 'skill-test-multi-lvl';
    // L1→2: 50, L2→3: 125, L3→4: 200
    // Start at L1, xp=0. Add 200 XP.
    // 50 to reach L2 (overflow 0), then need 125 for L3 (not enough → stay L2 with 0? No.)
    // Actually: 200 XP. First 50 → L2 (150 remaining). Next 125 → L3 (25 remaining). L3→4 needs 200, not enough.
    // So final: level=3, xp=25
    await db.skills.put({
      id: skillId,
      name: 'Cooking',
      description: 'Preparing meals',
      attribute: 'craft',
      icon: 'pot',
      level: 1,
      xp: 0,
      createdAt: Date.now(),
    });

    const updated = await xpService.applySkillXp(skillId, 200);
    expect(updated.level).toBe(3);
    expect(updated.xp).toBe(25); // 200 - 50 - 125 = 25
  });

  it('skill:xp payload contains skillId and xpGained', async () => {
    const { db } = await import('../../src/core/db');
    const skillId = 'skill-test-xp-payload';
    await db.skills.put({
      id: skillId,
      name: 'Meditation',
      description: 'Mindfulness',
      attribute: 'spirit',
      icon: 'lotus',
      level: 1,
      xp: 0,
      createdAt: Date.now(),
    });

    await xpService.applySkillXp(skillId, 15);
    const xpEvent = emitted.find((e) => e.name === 'skill:xp');
    expect(xpEvent).toBeDefined();
    const payload = xpEvent!.payload as { skillId: string; xpGained: number };
    expect(payload.skillId).toBe(skillId);
    expect(payload.xpGained).toBe(15);
  });
});

// ---------- skillLevelXpThreshold (from types.ts) ----------

describe('skillLevelXpThreshold', () => {
  it('L1→2 = 50', () => {
    expect(skillLevelXpThreshold(1)).toBe(50);
  });

  it('L2→3 = 125', () => {
    expect(skillLevelXpThreshold(2)).toBe(125);
  });

  it('L3→4 = 200', () => {
    expect(skillLevelXpThreshold(3)).toBe(200);
  });

  it('L9→10 = 650', () => {
    expect(skillLevelXpThreshold(9)).toBe(650);
  });
});
