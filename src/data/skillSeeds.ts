import type { Skill } from '@core/types';

/**
 * Seed skills (carried over from v3: 14 seeds). Seeds are inserted only when
 * the DB is empty; afterwards skills live in the DB alone.
 */
export type SkillSeed = Omit<Skill, 'id' | 'level' | 'xp' | 'createdAt'>;

export const SKILL_SEEDS: readonly SkillSeed[] = [
  { name: 'Fitness', description: 'Physical exercise and body training', attribute: 'body', icon: 'dumbbell' },
  { name: 'Running', description: 'Cardio and endurance training', attribute: 'body', icon: 'run' },
  { name: 'Cooking', description: 'Preparing healthy meals', attribute: 'craft', icon: 'pot' },
  { name: 'Programming', description: 'Writing and understanding code', attribute: 'craft', icon: 'code' },
  { name: 'Writing', description: 'Clear and consistent written expression', attribute: 'mind', icon: 'quill' },
  { name: 'Reading', description: 'Absorbing knowledge from books', attribute: 'mind', icon: 'book' },
  { name: 'Language Learning', description: 'Acquiring new languages', attribute: 'mind', icon: 'globe' },
  { name: 'Music', description: 'Playing and understanding music', attribute: 'spirit', icon: 'note' },
  { name: 'Meditation', description: 'Mindfulness and mental stillness', attribute: 'spirit', icon: 'lotus' },
  { name: 'Sleep Hygiene', description: 'Regular, restorative sleep', attribute: 'body', icon: 'moon' },
  { name: 'Housekeeping', description: 'Keeping the home in order', attribute: 'craft', icon: 'broom' },
  { name: 'Socializing', description: 'Maintaining relationships', attribute: 'spirit', icon: 'people' },
  { name: 'Gardening', description: 'Growing plants and tending greenery', attribute: 'craft', icon: 'sprout' },
  { name: 'Finance', description: 'Budgeting and managing money', attribute: 'mind', icon: 'coins' },
] as const;
