/**
 * Calendar service — CRUD for CalendarEvent entities.
 * UI talks to core ONLY through this service (never Dexie directly).
 */

import type { CalendarEvent, EventBus } from '@core/types';
import type { CalendarService } from '@core/services';
import type { LagDB } from '@core/db';

/** Format a JS Date as local YYYY-MM-DD. */
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** Convert an ISO yyyy-mm-dd date to the startsAt format stored in DB. */
function dateToStartsAt(date: string): string {
  return `${date}T00:00`;
}

/** Extract the yyyy-mm-dd date portion from a startsAt string. */
function startsAtToDate(startsAt: string): string {
  return startsAt.slice(0, 10);
}

export function createCalendarService(
  db: LagDB,
  eventBus: EventBus,
): CalendarService {
  return {
    /** Create a calendar event. Converts date (yyyy-mm-dd) to startsAt. Emits calendar:event:created. */
    async addEvent(input) {
      const id = crypto.randomUUID();
      const event: CalendarEvent = {
        id,
        title: input.title,
        startsAt: dateToStartsAt(input.date),
        durationMin: input.durationMin ?? 60,
        categoryId: input.categoryId ?? null,
      };

      await db.events.add(event);
      eventBus.emit('calendar:event:created', { event });
      return event;
    },

    /** Update mutable fields of an event. Emits calendar:event:updated. */
    async updateEvent(id, patch) {
      const existing = await db.events.get(id);
      if (!existing) throw new Error('CalendarEvent not found');

      const updated: CalendarEvent = { ...existing, ...patch };
      await db.events.put(updated);
      eventBus.emit('calendar:event:updated', { event: updated });
      return updated;
    },

    /** Delete an event. Emits calendar:event:deleted. */
    async removeEvent(id) {
      const existing = await db.events.get(id);
      if (!existing) throw new Error('CalendarEvent not found');

      await db.events.delete(id);
      eventBus.emit('calendar:event:deleted', { eventId: id });
    },

    /** List events for a single day (ISO yyyy-mm-dd). */
    async listByDay(date) {
      const prefix = dateToStartsAt(date);
      // Use startsAt index for efficient prefix query
      const all = await db.events
        .where('startsAt')
        .startsWith(prefix)
        .toArray();
      return all;
    },

    /** List events in a date range (fromISO and toISO are yyyy-mm-dd strings, inclusive). */
    async listRange(fromISO, toISO) {
      const fromStartsAt = dateToStartsAt(fromISO);
      const toStartsAt = dateToStartsAt(toISO);
      // Query events where startsAt is between fromStartsAt and toStartsAt + 1 day prefix
      // Since startsAt format is yyyy-mm-ddThh:mm, range query works lexicographically
      const all = await db.events
        .where('startsAt')
        .between(fromStartsAt, `${toStartsAt}\uffff`, true, true)
        .toArray();
      return all;
    },

    /** Convenience: list events for today. */
    async eventsForToday() {
      const today = localDay(new Date());
      return this.listByDay(today);
    },
  };
}
