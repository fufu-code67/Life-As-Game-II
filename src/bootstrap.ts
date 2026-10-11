/**
 * App bootstrap: wires db, event bus and core services together.
 * This is the ONLY composition root; ui components receive services from here.
 */
import { initDb, db } from '@core/db';
import { createEventBus } from '@core/eventBus';
import { createQuestService } from '@core/quests';
import { createXpService } from '@core/xp';
import { createStreakService } from '@core/streaks';
import { createSkillService } from '@core/skills';
import { SKILL_SEEDS } from '@data/skillSeeds';
import { matchQuestToSkill } from '@ai/skillMatcher';
import { getApiKey } from '@ai/config';
import type { EventBus } from '@core/types';
import type { QuestService } from '@core/services';
import type { XpService } from '@core/services';
import type { StreakService } from '@core/services';
import type { SkillService } from '@core/services';

export interface AppContext {
  bus: EventBus;
  quests: QuestService;
  xp: XpService;
  streaks: StreakService;
  skills: SkillService;
}

let ctx: AppContext | null = null;

export async function bootApp(): Promise<AppContext> {
  if (ctx) return ctx;

  initDb();
  const bus = createEventBus();

  const skills = createSkillService(db, bus);
  const xp = createXpService(db, bus);
  const streaks = createStreakService(db, bus);
  const quests = createQuestService(db, bus, xp, streaks);

  // Seed skills once (empty DB only) — afterwards the DB is authoritative.
  const existing = await skills.list();
  if (existing.length === 0) {
    for (const seed of SKILL_SEEDS) {
      await skills.createFromAIProposal(seed);
    }
  }

  // ── Phase 3: wire quest completion → AI skill matching ──
  bus.on('quest:completed', async ({ quest, xpGained }) => {
    const apiKey = getApiKey();
    if (!apiKey) {
      // Offline mode: skip AI call entirely, emit failure event
      bus.emit('ai:skillmatch:failed', { questId: quest.id, reason: 'no-api-key' });
      return;
    }

    const allSkills = await skills.list();
    const result = await matchQuestToSkill(quest.title, quest.description, {
      skills: allSkills.map((s) => ({ id: s.id, name: s.name })),
      apiKey,
    });

    if (!result.ok) {
      bus.emit('ai:skillmatch:failed', { questId: quest.id, reason: result.reason });
      return;
    }

    let skillId: string;

    if ('existingSkillId' in result) {
      // Link quest to existing skill via direct DB write
      // (core SkillService has no quest-linking fn; this is the composition root
      //  which already holds db, so a direct update is minimal and intentional)
      await db.quests.update(quest.id, { skillId: result.existingSkillId });
      skillId = result.existingSkillId;
      bus.emit('skill:mapped', { questId: quest.id, skillId, createdSkill: false });
    } else {
      // AI proposed a new skill — create it and link
      const newSkill = await skills.createFromAIProposal(result.newSkill);
      await db.quests.update(quest.id, { skillId: newSkill.id });
      skillId = newSkill.id;
      bus.emit('skill:mapped', { questId: quest.id, skillId, createdSkill: true });
    }

    // Apply skill XP from the completed quest
    await xp.applySkillXp(skillId, xpGained);
  });

  ctx = { bus, quests, xp, streaks, skills };
  return ctx;
}
