/**
 * Tests for StreakService contract (core/services.ts StreakService).
 *
 * Contract rules (from types.ts + DECISIONS.md):
 *   - Same-day completion does NOT increment current streak
 *   - Consecutive day increments current by 1
 *   - A gap (non-consecutive day) resets current to 1
 *   - best always tracks the max current ever seen
 *   - recordCompletion emits 'streak:updated'
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, db } from '../../src/core/db';
import { createEventBus } from '../../src/core/eventBus';
import type { StreakState, EventBus } from '../../src/core/types';

/**
 * Helper: build a minimal StreakService against the live DB + event bus.
 * The real implementation will live in src/core/; we exercise the contract
 * through a thin wrapper that mirrors the service interface.
 *
 * Since the implementation is in-flight, we import from a barrel that
 * will export `createStreakService`. If that doesn't exist yet, the test
 * file is still valid TypeScript — type errors for missing modules are
 * acceptable per the task spec.
 */
import { createStreakService } from '../../src/core/streaks';

let bus: EventBus;
let streakService: {
  get(): Promise<StreakState>;
  recordCompletion(day: string): Promise<StreakState>;
};
let emitted: { name: string; payload: unknown }[];

beforeEach(async () => {
  // Fresh DB per test
  const dbName = `lag_test_streaks_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  initDb(dbName);
  bus = createEventBus();
  emitted = [];

  // Capture all streak:updated emissions
  bus.on('streak:updated', (payload) => {
    emitted.push({ name: 'streak:updated', payload });
  });

  // Instantiate the streak service (implementation provides this factory)
  streakService = createStreakService(db, bus);
});

describe('StreakService', () => {
  it('starts at current=0, best=0, lastCompletionDay=null', async () => {
    const state = await streakService.get();
    expect(state.current).toBe(0);
    expect(state.best).toBe(0);
    expect(state.lastCompletionDay).toBeNull();
  });

  it('first completion sets current=1, best=1', async () => {
    const state = await streakService.recordCompletion('2026-10-11');
    expect(state.current).toBe(1);
    expect(state.best).toBe(1);
    expect(state.lastCompletionDay).toBe('2026-10-11');
  });

  it('same-day completion does NOT increment current', async () => {
    await streakService.recordCompletion('2026-10-11');
    const state = await streakService.recordCompletion('2026-10-11');
    expect(state.current).toBe(1);
    expect(state.best).toBe(1);
    expect(state.lastCompletionDay).toBe('2026-10-11');
  });

  it('consecutive day increments current', async () => {
    await streakService.recordCompletion('2026-10-10');
    const state = await streakService.recordCompletion('2026-10-11');
    expect(state.current).toBe(2);
    expect(state.best).toBe(2);
    expect(state.lastCompletionDay).toBe('2026-10-11');
  });

  it('gap resets current to 1', async () => {
    await streakService.recordCompletion('2026-10-09');
    await streakService.recordCompletion('2026-10-10');
    // Skip 2026-10-11
    const state = await streakService.recordCompletion('2026-10-12');
    expect(state.current).toBe(1);
    expect(state.lastCompletionDay).toBe('2026-10-12');
  });

  it('best tracks the maximum current ever seen', async () => {
    // Build a streak of 3
    await streakService.recordCompletion('2026-10-09');
    await streakService.recordCompletion('2026-10-10');
    await streakService.recordCompletion('2026-10-11'); // current=3, best=3
    // Break the streak
    const state = await streakService.recordCompletion('2026-10-13'); // current=1
    expect(state.current).toBe(1);
    expect(state.best).toBe(3);
  });

  it('recordCompletion emits streak:updated', async () => {
    await streakService.recordCompletion('2026-10-11');
    expect(emitted.some((e) => e.name === 'streak:updated')).toBe(true);
  });

  it('emitted streak:updated payload matches returned state', async () => {
    const state = await streakService.recordCompletion('2026-10-11');
    const lastEmitted = (emitted.filter((e) => e.name === 'streak:updated').at(-1)!
      .payload as { streak: StreakState }).streak;
    expect(lastEmitted.current).toBe(state.current);
    expect(lastEmitted.best).toBe(state.best);
    expect(lastEmitted.lastCompletionDay).toBe(state.lastCompletionDay);
  });

  it('long streak: current keeps incrementing on consecutive days', async () => {
    const base = new Date('2026-10-01');
    for (let i = 0; i < 7; i++) {
      const day = new Date(base);
      day.setDate(day.getDate() + i);
      const iso = day.toISOString().slice(0, 10);
      const state = await streakService.recordCompletion(iso);
      expect(state.current).toBe(i + 1);
      expect(state.best).toBe(i + 1);
    }
  });
});
