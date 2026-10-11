/**
 * Tests for QuestService contract (core/services.ts QuestService).
 *
 * Contract rules:
 *   - createQuest: valid categoryId → Quest with uuid id, emits quest:created
 *   - createQuest: invalid categoryId → throws CategoryNotFoundError
 *   - completeQuest: sets status='done', completedAt, correct xpGained incl. streak
 *   - completeQuest on already-done quest → throws QuestAlreadyCompletedError
 *   - archiveQuest: sets status='archived', emits quest:archived
 *   - toggleBossSubtask: toggling last subtask emits boss:defeated
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, db } from '../../src/core/db';
import { createEventBus } from '../../src/core/eventBus';
import { CATEGORIES } from '../../src/data/categories';
import type { Quest, EventBus } from '../../src/core/types';

/**
 * Import the service factory. Implementation is in-flight; type errors
 * for missing modules are acceptable per task spec.
 */
import { createQuestService } from '../../src/core/quests';
import { createXpService } from '../../src/core/xp';
import { createStreakService } from '../../src/core/streaks';

let bus: EventBus;
let questService: {
  createQuest(input: {
    title: string;
    description?: string;
    categoryId: string;
    difficulty?: 'easy' | 'normal' | 'hard';
    isBossQuest?: boolean;
    subtasks?: string[];
  }): Promise<Quest>;
  completeQuest(id: string): Promise<{ quest: Quest; xpGained: number }>;
  archiveQuest(id: string): Promise<Quest>;
  toggleBossSubtask(questId: string, subtaskId: string): Promise<Quest>;
};
let emitted: { name: string; payload: unknown }[];

beforeEach(() => {
  const dbName = `lag_test_quests_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  initDb(dbName);
  bus = createEventBus();
  emitted = [];

  // Capture relevant events
  bus.on('quest:created', (payload) => emitted.push({ name: 'quest:created', payload }));
  bus.on('quest:completed', (payload) => emitted.push({ name: 'quest:completed', payload }));
  bus.on('quest:archived', (payload) => emitted.push({ name: 'quest:archived', payload }));
  bus.on('boss:defeated', (payload) => emitted.push({ name: 'boss:defeated', payload }));
  bus.on('streak:updated', (payload) => emitted.push({ name: 'streak:updated', payload }));

  questService = createQuestService(db, bus, createXpService(db, bus), createStreakService(db, bus));
});

// ---------- createQuest ----------

describe('createQuest', () => {
  it('happy path: valid categoryId returns quest with uuid id', async () => {
    const quest = await questService.createQuest({
      title: 'Run 5km',
      categoryId: CATEGORIES[0]!.id, // 'health'
      difficulty: 'normal',
    });

    // UUID v4 format: 8-4-4-4-12 hex chars
    expect(quest.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(quest.title).toBe('Run 5km');
    expect(quest.categoryId).toBe(CATEGORIES[0]!.id);
    expect(quest.status).toBe('open');
    expect(quest.completedAt).toBeNull();
  });

  it('emits quest:created with the quest', async () => {
    const quest = await questService.createQuest({
      title: 'Read a book',
      categoryId: CATEGORIES[2]!.id, // 'learning'
    });

    const createdEvents = emitted.filter((e) => e.name === 'quest:created');
    expect(createdEvents.length).toBe(1);
    const payload = createdEvents[0]!.payload as { quest: Quest };
    expect(payload.quest.id).toBe(quest.id);
  });

  it('invalid categoryId throws CategoryNotFoundError', async () => {
    await expect(
      questService.createQuest({
        title: 'Invalid quest',
        categoryId: 'nonexistent',
      }),
    ).rejects.toThrow('CategoryNotFoundError');
  });

  it('defaults difficulty to normal when omitted', async () => {
    const quest = await questService.createQuest({
      title: 'Default difficulty',
      categoryId: CATEGORIES[0]!.id,
    });
    expect(quest.difficulty).toBe('normal');
  });

  it('creates a boss quest with subtasks', async () => {
    const quest = await questService.createQuest({
      title: 'Defeat the Procrastination Dragon',
      categoryId: CATEGORIES[1]!.id, // 'productivity'
      isBossQuest: true,
      subtasks: ['Plan the day', 'Execute first task', 'Review progress'],
    });

    expect(quest.isBossQuest).toBe(true);
    expect(quest.subtasks.length).toBe(3);
    expect(quest.subtasks[0]!.title).toBe('Plan the day');
    expect(quest.subtasks.every((st) => st.done === false)).toBe(true);
  });
});

// ---------- completeQuest ----------

describe('completeQuest', () => {
  it('sets status=done and completedAt', async () => {
    const quest = await questService.createQuest({
      title: 'Morning jog',
      categoryId: CATEGORIES[0]!.id,
      difficulty: 'easy',
    });

    const { quest: completed } = await questService.completeQuest(quest.id);
    expect(completed.status).toBe('done');
    expect(completed.completedAt).not.toBeNull();
    expect(typeof completed.completedAt).toBe('number');
  });

  it('xpGained includes streak multiplier', async () => {
    // With streak=0, easy quest gives base 10 XP
    const quest = await questService.createQuest({
      title: 'Easy task',
      categoryId: CATEGORIES[0]!.id,
      difficulty: 'easy',
    });

    const { xpGained } = await questService.completeQuest(quest.id);
    // Base easy = 10, streak=0 → multiplier 1.0 → 10
    expect(xpGained).toBe(10);
  });

  it('emits quest:completed and streak:updated', async () => {
    const quest = await questService.createQuest({
      title: 'Study session',
      categoryId: CATEGORIES[2]!.id,
      difficulty: 'normal',
    });

    await questService.completeQuest(quest.id);

    expect(emitted.some((e) => e.name === 'quest:completed')).toBe(true);
    expect(emitted.some((e) => e.name === 'streak:updated')).toBe(true);
  });

  it('second completeQuest throws QuestAlreadyCompletedError', async () => {
    const quest = await questService.createQuest({
      title: 'One-shot quest',
      categoryId: CATEGORIES[0]!.id,
    });

    await questService.completeQuest(quest.id);

    await expect(questService.completeQuest(quest.id)).rejects.toThrow(
      'QuestAlreadyCompletedError',
    );
  });
});

// ---------- archiveQuest ----------

describe('archiveQuest', () => {
  it('sets status to archived', async () => {
    const quest = await questService.createQuest({
      title: 'Old quest',
      categoryId: CATEGORIES[0]!.id,
    });

    const archived = await questService.archiveQuest(quest.id);
    expect(archived.status).toBe('archived');
  });

  it('emits quest:archived', async () => {
    const quest = await questService.createQuest({
      title: 'To archive',
      categoryId: CATEGORIES[0]!.id,
    });

    await questService.archiveQuest(quest.id);
    const archivedEvents = emitted.filter((e) => e.name === 'quest:archived');
    expect(archivedEvents.length).toBe(1);
    const payload = archivedEvents[0]!.payload as { quest: Quest };
    expect(payload.quest.id).toBe(quest.id);
  });
});

// ---------- toggleBossSubtask ----------

describe('toggleBossSubtask', () => {
  it('toggling last subtask emits boss:defeated', async () => {
    const quest = await questService.createQuest({
      title: 'Boss fight',
      categoryId: CATEGORIES[1]!.id,
      isBossQuest: true,
      subtasks: ['Step 1', 'Step 2'],
    });

    // Complete first subtask
    await questService.toggleBossSubtask(quest.id, quest.subtasks[0]!.id);

    // Complete last subtask → boss defeated
    const updated = await questService.toggleBossSubtask(quest.id, quest.subtasks[1]!.id);

    expect(updated.subtasks.every((st) => st.done)).toBe(true);

    const defeatedEvents = emitted.filter((e) => e.name === 'boss:defeated');
    expect(defeatedEvents.length).toBe(1);
    const payload = defeatedEvents[0]!.payload as { quest: Quest; xpGained: number };
    expect(payload.quest.id).toBe(quest.id);
    expect(payload.xpGained).toBeGreaterThan(0);
  });

  it('toggling a non-last subtask does NOT emit boss:defeated', async () => {
    const quest = await questService.createQuest({
      title: 'Boss fight 2',
      categoryId: CATEGORIES[1]!.id,
      isBossQuest: true,
      subtasks: ['Step A', 'Step B', 'Step C'],
    });

    await questService.toggleBossSubtask(quest.id, quest.subtasks[0]!.id);

    const defeatedEvents = emitted.filter((e) => e.name === 'boss:defeated');
    expect(defeatedEvents.length).toBe(0);
  });

  it('toggling a subtask flips its done state', async () => {
    const quest = await questService.createQuest({
      title: 'Boss fight 3',
      categoryId: CATEGORIES[1]!.id,
      isBossQuest: true,
      subtasks: ['Step X'],
    });

    const afterFirst = await questService.toggleBossSubtask(
      quest.id,
      quest.subtasks[0]!.id,
    );
    expect(afterFirst.subtasks[0]!.done).toBe(true);

    // Toggle back off
    const afterSecond = await questService.toggleBossSubtask(
      quest.id,
      quest.subtasks[0]!.id,
    );
    expect(afterSecond.subtasks[0]!.done).toBe(false);
  });
});
