import type { QuestDifficulty } from '@core/types';

/** XP by difficulty (before streak multiplier). Frozen in Phase 0. */
export const QUEST_XP: Record<QuestDifficulty, number> = {
  easy: 10,
  normal: 25,
  hard: 50,
};

/** Boss quest base XP; subtask completion grants partial XP (QUEST_XP.normal). */
export const BOSS_XP_BASE = 120;
/** Streak multiplier bonus: +10% per current streak day, capped. */
export const STREAK_BONUS_PER_DAY = 0.1;
export const STREAK_BONUS_CAP = 1.0; // +100% max
