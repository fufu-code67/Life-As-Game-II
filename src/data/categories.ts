import type { Category } from '@core/types';

/** Single source of truth for categories. NEVER duplicate elsewhere. */
export const CATEGORIES: readonly Category[] = [
  { id: 'health', name: 'Health', color: '#e57373' },
  { id: 'productivity', name: 'Productivity', color: '#64b5f6' },
  { id: 'learning', name: 'Learning', color: '#ffd54f' },
  { id: 'craft', name: 'Craft', color: '#81c784' },
  { id: 'social', name: 'Social', color: '#ba68c8' },
  { id: 'chores', name: 'Chores', color: '#ffb74d' },
] as const;
