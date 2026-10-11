import Dexie, { type Table } from 'dexie';
import type { Quest, Skill, CalendarEvent, StreakState } from './types';

/** Dexie schema, v1. Frozen in Phase 0 — migrations only via db.version(N). */
export class LagDB extends Dexie {
  quests!: Table<Quest, string>;
  skills!: Table<Skill, string>;
  events!: Table<CalendarEvent, string>;
  meta!: Table<{ key: string; value: unknown }, string>;

  constructor() {
    super('lifeasgame_v4');
    this.version(1).stores({
      quests: 'id, status, categoryId, questlineId, createdAt',
      skills: 'id, name, level, attribute',
      events: 'id, startsAt, categoryId',
      meta: 'key',
    });
  }
}

export let db: LagDB;

/** Create/open the DB. `name` may be overridden for tests (unique per test). */
export function initDb(name = 'lifeasgame_v4'): LagDB {
  if (db) db.close();
  db = new LagDB();
  if (name !== 'lifeasgame_v4') {
    db = new Dexie(name) as unknown as LagDB; // test-only re-instance shares schema below
    (db as unknown as Dexie).version(1).stores({
      quests: 'id, status, categoryId, questlineId, createdAt',
      skills: 'id, name, level, attribute',
      events: 'id, startsAt, categoryId',
      meta: 'key',
    });
  }
  db.open();
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = undefined as unknown as LagDB;
  }
}

export function getStreak(): Promise<StreakState> {
  return db.meta.get('streak').then((row) => {
    return (
      (row?.value as StreakState) ?? { current: 0, best: 0, lastCompletionDay: null }
    );
  });
}
