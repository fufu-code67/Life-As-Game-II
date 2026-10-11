/**
 * XP service — compute quest/boss XP with streak bonus, apply skill XP with level-ups.
 */

import type { Skill, EventBus } from '@core/types';
import { skillLevelXpThreshold } from '@core/types';
import type { XpService } from '@core/services';
import type { LagDB } from '@core/db';
import { QUEST_XP, BOSS_XP_BASE, STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP } from '@data/quests';

export function createXpService(db: LagDB, eventBus: EventBus): XpService {
  return {
    /** Compute XP for a completion including streak bonus multiplier. Pure function. */
    computeXp(difficulty, streakCurrent, isBoss = false): number {
      const base = isBoss ? BOSS_XP_BASE : QUEST_XP[difficulty];
      const multiplier = 1 + Math.min(streakCurrent * STREAK_BONUS_PER_DAY, STREAK_BONUS_CAP);
      return Math.round(base * multiplier);
    },

    /** Apply skill XP; handles level-ups via skillLevelXpThreshold. Emits skill:xp and possibly skill:levelup. */
    async applySkillXp(skillId, xp): Promise<Skill> {
      const skill = await db.skills.get(skillId);
      if (!skill) throw new Error(`Skill not found: ${skillId}`);

      let currentXp = skill.xp + xp;
      let level = skill.level;

      while (currentXp >= skillLevelXpThreshold(level)) {
        currentXp -= skillLevelXpThreshold(level);
        level++;
      }

      const updated: Skill = {
        ...skill,
        level,
        xp: currentXp,
      };

      await db.skills.put(updated);

      eventBus.emit('skill:xp', { skillId, xpGained: xp });

      if (level !== skill.level) {
        eventBus.emit('skill:levelup', { skill: updated, newLevel: level });
      }

      return updated;
    },
  };
}
