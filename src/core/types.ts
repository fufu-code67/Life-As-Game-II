/**
 * LifeAsGame v4 — central type contracts.
 * Frozen in Phase 0. Changes require Orchestrator (GLM Flash) approval.
 */

// ---------- Entities ----------

export interface Category {
  readonly id: string; // lowercase slug, e.g. "health"
  readonly name: string; // TitleCase display name, e.g. "Health"
  readonly color: string; // hex, e.g. "#8bc34a"
}

export interface Quest {
  readonly id: string; // uuid
  title: string;
  description: string;
  categoryId: string; // references Category.id
  /** Absolute XP reward granted on completion (before streak multiplier). */
  xp: number;
  difficulty: QuestDifficulty;
  isBossQuest: boolean;
  /** Boss quest subtasks; completing all defeats the boss. */
  subtasks: BossSubtask[];
  status: QuestStatus;
  createdAt: number; // epoch ms
  completedAt: number | null;
  /** Id of the skill this quest was mapped to, if already matched. */
  skillId: string | null;
  /** Questline id if part of a generated questline. */
  questlineId: string | null;
}

export interface BossSubtask {
  readonly id: string;
  title: string;
  done: boolean;
}

export type QuestDifficulty = 'easy' | 'normal' | 'hard';
export type QuestStatus = 'open' | 'done' | 'archived';

export interface Skill {
  readonly id: string; // uuid
  name: string; // TitleCase, 1-2 words, no punctuation (see ai/normalize)
  description: string;
  attribute: SkillAttribute;
  icon: string; // icon key from assets, not raw emoji contract — see docs/DECISIONS.md
  level: number; // 1..10
  xp: number; // xp within current level
  readonly createdAt: number;
}

export type SkillAttribute = 'body' | 'mind' | 'spirit' | 'craft';

export interface CalendarEvent {
  readonly id: string;
  title: string;
  /** ISO 8601 local datetime string. */
  startsAt: string;
  durationMin: number;
  /** Category the event belongs to; may be empty. */
  categoryId: string | null;
}

export interface StreakState {
  current: number; // consecutive days with >=1 completed quest
  best: number;
  lastCompletionDay: string | null; // ISO date (YYYY-MM-DD), local
}

// ---------- Game projection ----------

export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';

export interface GameStateProjection {
  timeOfDay: TimeOfDay;
  streak: StreakState;
}

// ---------- Event bus ----------

/** All event names, frozen. `game` and `ui` communicate with `core` ONLY via these. */
export type AppEventMap = {
  'quest:created': { quest: Quest };
  'quest:completed': { quest: Quest; xpGained: number };
  'quest:archived': { quest: Quest };
  'skill:mapped': { questId: string; skillId: string; createdSkill: boolean };
  'skill:xp': { skillId: string; xpGained: number };
  'skill:levelup': { skill: Skill; newLevel: number };
  'skill:created': { skill: Skill };
  'calendar:event:created': { event: CalendarEvent };
  'calendar:event:updated': { event: CalendarEvent };
  'calendar:event:deleted': { eventId: string };
  'streak:updated': { streak: StreakState };
  'time:changed': { timeOfDay: TimeOfDay };
  'boss:subtask:done': { quest: Quest; remaining: number };
  'boss:defeated': { quest: Quest; xpGained: number };
  'ai:skillmatch:failed': { questId: string; reason: string };
};

export type AppEventName = keyof AppEventMap;
export type AppEventHandler<N extends AppEventName> = (payload: AppEventMap[N]) => void;

export interface EventBus {
  on<N extends AppEventName>(name: N, handler: AppEventHandler<N>): () => void;
  emit<N extends AppEventName>(name: N, payload: AppEventMap[N]): void;
  off<N extends AppEventName>(name: N, handler: AppEventHandler<N>): void;
}

// ---------- AI contracts ----------

export interface SkillMatchResult {
  /** Existing skill id, or null if the AI proposed a new skill. */
  readonly existingSkillId: string | null;
  /** Present only when existingSkillId is null. */
  readonly newSkill?: Pick<Skill, 'name' | 'attribute' | 'description' | 'icon'>;
}

// ---------- XP / Level rules ----------

/** XP needed to go from level L to L+1 for skills (cumulative difficulty ramps). */
export function skillLevelXpThreshold(level: number): number {
  return 50 + (level - 1) * 75; // L1->2: 50, L2->3: 125, ...
}
