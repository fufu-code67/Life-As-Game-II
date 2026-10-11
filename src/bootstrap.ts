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

  ctx = { bus, quests, xp, streaks, skills };
  return ctx;
}
