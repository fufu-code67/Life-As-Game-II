import type { Quest, Skill, StreakState, QuestDifficulty, SkillMatchResult } from './types';

/**
 * Core service contracts — FROZEN in Phase 1.
 * `ui` and `game` may call ONLY these functions (plus the event bus).
 */

export interface QuestService {
  /** Create a quest. Emits `quest:created`. Returns the stored quest. */
  createQuest(input: {
    title: string;
    description?: string;
    categoryId: string; // must exist in CATEGORIES
    difficulty?: QuestDifficulty;
    isBossQuest?: boolean;
    subtasks?: string[]; // titles; converted to BossSubtask[]
  }): Promise<Quest>;

  /** Update mutable fields of an open quest. Throws QuestNotFoundError if missing. */
  updateQuest(id: string, patch: Partial<Pick<Quest, 'title' | 'description' | 'categoryId' | 'difficulty' | 'status'>>): Promise<Quest>;

  /**
   * Complete an open quest. Applies XP rules (data/quests.ts) + streak bonus,
   * updates the streak, emits `quest:completed` (+ `streak:updated`, `boss:defeated`
   * for bosses when the last subtask completes). Returns xpGained.
   * Throws QuestNotFoundError / QuestAlreadyCompletedError.
   */
  completeQuest(id: string): Promise<{ quest: Quest; xpGained: number }>;

  /** Toggle a boss subtask; emits `boss:subtask:done` (and `boss:defeated` when last). */
  toggleBossSubtask(questId: string, subtaskId: string): Promise<Quest>;

  /** Archive instead of delete (no data loss). Emits `quest:archived`. */
  archiveQuest(id: string): Promise<Quest>;

  listQuests(status?: 'open' | 'done' | 'archived'): Promise<Quest[]>;
  getQuest(id: string): Promise<Quest | undefined>;
}

export interface XpService {
  /** Compute XP for a completion incl. streak bonus multiplier. Pure function. */
  computeXp(difficulty: QuestDifficulty, streakCurrent: number, isBoss?: boolean): number;

  /**
   * Apply skill xp; handles level-ups (skillLevelXpThreshold). Emits `skill:xp`
   * and possibly `skill:levelup`. Returns the updated skill.
   */
  applySkillXp(skillId: string, xp: number): Promise<Skill>;
}

export interface StreakService {
  get(): Promise<StreakState>;
  /** Called on every quest completion; updates current/best/lastCompletionDay. Emits `streak:updated`. */
  recordCompletion(day: string): Promise<StreakState>;
}

export interface SkillService {
  list(): Promise<Skill[]>;
  get(id: string): Promise<Skill | undefined>;

  /**
   * Map a completed quest to a skill. Level 1: exact normalized-name match.
   * Level 2: one AI call via the injected matcher. On AI failure: emits
   * `ai:skillmatch:failed` and leaves the quest unmapped (safe fallback).
   * Emits `skill:mapped` (+ `skill:created` if a new skill was made).
   */
  mapQuestToSkill(questId: string, matcher: (title: string, description: string) => Promise<SkillMatchResult>): Promise<{ skillId: string; createdSkill: boolean } | null>;

  /** Create a skill from an AI proposal with normalization applied. Emits `skill:created`. */
  createFromAIProposal(proposal: { name: string; attribute: string; description: string; icon: string }): Promise<Skill>;
}

/** Name normalization contract (ai/normalize.ts): 1–2 words, TitleCase, no punctuation. */
export function normalizeSkillName(raw: string): string;
