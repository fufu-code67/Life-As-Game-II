/**
 * Streak service — track consecutive completion days.
 */

import type { StreakState, EventBus } from '@core/types';
import type { StreakService } from '@core/services';
import type { LagDB } from '@core/db';

/** Compute the calendar day after a YYYY-MM-DD string (local time arithmetic). */
function dayAfter(dateStr: string): string {
  const parts = dateStr.split('-');
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  const dt = new Date(y, m - 1, d + 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

const DEFAULT_STREAK: StreakState = { current: 0, best: 0, lastCompletionDay: null };

export function createStreakService(db: LagDB, eventBus: EventBus): StreakService {
  return {
    async get(): Promise<StreakState> {
      const row = await db.meta.get('streak');
      return (row?.value as StreakState) ?? DEFAULT_STREAK;
    },

    /** Record a quest completion on the given day; update current/best/lastCompletionDay. Emits streak:updated. */
    async recordCompletion(day): Promise<StreakState> {
      const current = await this.get();

      if (current.lastCompletionDay === day) {
        // Same day — no change
        return current;
      }

      let newCurrent: number;
      if (current.lastCompletionDay === null) {
        newCurrent = 1;
      } else if (day === dayAfter(current.lastCompletionDay)) {
        newCurrent = current.current + 1;
      } else {
        newCurrent = 1;
      }

      const updated: StreakState = {
        current: newCurrent,
        best: Math.max(current.best, newCurrent),
        lastCompletionDay: day,
      };

      await db.meta.put({ key: 'streak', value: updated });
      eventBus.emit('streak:updated', { streak: updated });
      return updated;
    },
  };
}
