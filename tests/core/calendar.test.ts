/**
 * Tests for CalendarService contract (core/services.ts CalendarService).
 *
 * Contract rules:
 *   - addEvent: creates event with uuid id, emits calendar:event:created
 *   - updateEvent: patches fields, emits calendar:event:updated
 *   - removeEvent: deletes event, emits calendar:event:deleted
 *   - listByDay: returns events for a given date
 *   - listRange: returns events in a date range
 *   - eventsForToday: returns events for today
 */
import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { initDb, db } from '../../src/core/db';
import { createEventBus } from '../../src/core/eventBus';
import { CATEGORIES } from '../../src/data/categories';
import type { CalendarEvent, EventBus } from '../../src/core/types';
import { createCalendarService } from '../../src/core/calendar';

let bus: EventBus;
let calendarService: ReturnType<typeof createCalendarService>;
let emitted: { name: string; payload: unknown }[];

beforeEach(() => {
  const dbName = `lag_test_calendar_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  initDb(dbName);
  bus = createEventBus();
  emitted = [];

  bus.on('calendar:event:created', (payload) => emitted.push({ name: 'calendar:event:created', payload }));
  bus.on('calendar:event:updated', (payload) => emitted.push({ name: 'calendar:event:updated', payload }));
  bus.on('calendar:event:deleted', (payload) => emitted.push({ name: 'calendar:event:deleted', payload }));

  calendarService = createCalendarService(db, bus);
});

// ---------- addEvent ----------

describe('addEvent', () => {
  it('creates an event with uuid id and emits calendar:event:created', async () => {
    const event = await calendarService.addEvent({
      title: 'Team standup',
      date: '2026-10-12',
      categoryId: CATEGORIES[1]!.id,
    });

    expect(event.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(event.title).toBe('Team standup');
    expect(event.startsAt).toBe('2026-10-12T00:00');
    expect(event.categoryId).toBe(CATEGORIES[1]!.id);

    const createdEvents = emitted.filter((e) => e.name === 'calendar:event:created');
    expect(createdEvents.length).toBe(1);
    const payload = createdEvents[0]!.payload as { event: CalendarEvent };
    expect(payload.event.id).toBe(event.id);
  });

  it('defaults durationMin to 60', async () => {
    const event = await calendarService.addEvent({
      title: 'Quick call',
      date: '2026-10-13',
    });
    expect(event.durationMin).toBe(60);
  });

  it('defaults categoryId to null when omitted', async () => {
    const event = await calendarService.addEvent({
      title: 'No category event',
      date: '2026-10-14',
    });
    expect(event.categoryId).toBeNull();
  });
});

// ---------- updateEvent ----------

describe('updateEvent', () => {
  it('patches fields and emits calendar:event:updated', async () => {
    const event = await calendarService.addEvent({
      title: 'Original',
      date: '2026-10-12',
    });

    const updated = await calendarService.updateEvent(event.id, {
      title: 'Updated title',
    });

    expect(updated.title).toBe('Updated title');
    expect(updated.id).toBe(event.id);

    const updatedEvents = emitted.filter((e) => e.name === 'calendar:event:updated');
    expect(updatedEvents.length).toBe(1);
  });

  it('throws for non-existent event', async () => {
    await expect(
      calendarService.updateEvent('nonexistent-id', { title: 'Nope' }),
    ).rejects.toThrow('CalendarEvent not found');
  });
});

// ---------- removeEvent ----------

describe('removeEvent', () => {
  it('deletes event and emits calendar:event:deleted', async () => {
    const event = await calendarService.addEvent({
      title: 'To delete',
      date: '2026-10-12',
    });

    await calendarService.removeEvent(event.id);

    const deletedEvents = emitted.filter((e) => e.name === 'calendar:event:deleted');
    expect(deletedEvents.length).toBe(1);
    const payload = deletedEvents[0]!.payload as { eventId: string };
    expect(payload.eventId).toBe(event.id);

    // Verify it's gone from the DB
    const remaining = await calendarService.listByDay('2026-10-12');
    expect(remaining.length).toBe(0);
  });

  it('throws for non-existent event', async () => {
    await expect(
      calendarService.removeEvent('nonexistent-id'),
    ).rejects.toThrow('CalendarEvent not found');
  });
});

// ---------- listByDay ----------

describe('listByDay', () => {
  it('returns only events for the given date', async () => {
    await calendarService.addEvent({ title: 'Day 1 event', date: '2026-10-12' });
    await calendarService.addEvent({ title: 'Day 2 event', date: '2026-10-13' });
    await calendarService.addEvent({ title: 'Day 1 event 2', date: '2026-10-12' });

    const day1 = await calendarService.listByDay('2026-10-12');
    const day2 = await calendarService.listByDay('2026-10-13');

    expect(day1.length).toBe(2);
    expect(day2.length).toBe(1);
    expect(day2[0]!.title).toBe('Day 2 event');
  });
});

// ---------- listRange ----------

describe('listRange', () => {
  it('returns events within the date range inclusive', async () => {
    await calendarService.addEvent({ title: 'Before', date: '2026-10-10' });
    await calendarService.addEvent({ title: 'Start', date: '2026-10-11' });
    await calendarService.addEvent({ title: 'Middle', date: '2026-10-13' });
    await calendarService.addEvent({ title: 'End', date: '2026-10-15' });
    await calendarService.addEvent({ title: 'After', date: '2026-10-16' });

    const range = await calendarService.listRange('2026-10-11', '2026-10-15');
    expect(range.length).toBe(3);
    const titles = range.map((e) => e.title).sort();
    expect(titles).toEqual(['End', 'Middle', 'Start']);
  });
});

// ---------- eventsForToday ----------

describe('eventsForToday', () => {
  it('returns events for today', async () => {
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    await calendarService.addEvent({ title: 'Today event', date: todayStr });
    await calendarService.addEvent({ title: 'Tomorrow event', date: '2099-01-01' });

    const todayEvents = await calendarService.eventsForToday();
    expect(todayEvents.length).toBe(1);
    expect(todayEvents[0]!.title).toBe('Today event');
  });
});
