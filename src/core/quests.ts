/**
 * Quest service — CRUD, completion with XP/streak, boss subtask toggling, archiving.
 */

import type { Quest, BossSubtask, EventBus } from '@core/types';
import type { QuestService, XpService, StreakService } from '@core/services';
import type { LagDB } from '@core/db';
import { CATEGORIES } from '@data/categories';
import { QUEST_XP, BOSS_XP_BASE } from '@data/quests';
import {
  QuestNotFoundError,
  QuestAlreadyCompletedError,
  CategoryNotFoundError,
  ValidationError,
} from '@core/errors';

/** Format a JS Date as local YYYY-MM-DD. */
function localDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

export function createQuestService(
  db: LagDB,
  eventBus: EventBus,
  xpService: XpService,
  streakService: StreakService,
): QuestService {
  return {
    /** Create a quest. Validates categoryId, generates UUID, converts subtask titles to BossSubtask[]. Emits quest:created. */
    async createQuest(input) {
      if (!CATEGORIES.some((c) => c.id === input.categoryId)) {
        throw new CategoryNotFoundError(input.categoryId);
      }

      const id = crypto.randomUUID();
      const now = Date.now();

      const subtasks: BossSubtask[] = (input.subtasks ?? []).map((title) => ({
        id: crypto.randomUUID(),
        title,
        done: false,
      }));

      const quest: Quest = {
        id,
        title: input.title,
        description: input.description ?? '',
        categoryId: input.categoryId,
        xp: 0,
        difficulty: input.difficulty ?? 'normal',
        isBossQuest: input.isBossQuest ?? false,
        subtasks,
        status: 'open',
        createdAt: now,
        completedAt: null,
        skillId: null,
        questlineId: null,
      };

      await db.quests.add(quest);
      eventBus.emit('quest:created', { quest });
      return quest;
    },

    /** Update mutable fields of an open quest. Throws if not found or not open. */
    async updateQuest(id, patch) {
      const quest = await db.quests.get(id);
      if (!quest) throw new QuestNotFoundError(id);
      if (quest.status !== 'open') {
        throw new ValidationError('Cannot update a quest that is not open');
      }

      const updated: Quest = { ...quest, ...patch };
      await db.quests.put(updated);
      return updated;
    },

    /**
     * Complete an open quest. Computes XP, updates streak, sets status done + completedAt.
     * Emits quest:completed with xpGained. Throws QuestAlreadyCompletedError if already done.
     */
    async completeQuest(id) {
      const quest = await db.quests.get(id);
      if (!quest) throw new QuestNotFoundError(id);
      if (quest.status === 'done') throw new QuestAlreadyCompletedError(id);

      // Compute base XP (before streak) to store on the quest
      const baseXp = quest.isBossQuest ? BOSS_XP_BASE : QUEST_XP[quest.difficulty];

      // Get current streak for XP multiplier
      const streak = await streakService.get();
      const xpGained = xpService.computeXp(quest.difficulty, streak.current, quest.isBossQuest);

      // Record completion for streak (today's local date)
      const today = localDay(new Date());
      await streakService.recordCompletion(today);

      const updated: Quest = {
        ...quest,
        status: 'done',
        completedAt: Date.now(),
        xp: baseXp,
      };

      await db.quests.put(updated);
      eventBus.emit('quest:completed', { quest: updated, xpGained });

      return { quest: updated, xpGained };
    },

    /** Toggle a boss subtask; emits boss:subtask:done (and boss:defeated when all subtasks complete). */
    async toggleBossSubtask(questId, subtaskId) {
      const quest = await db.quests.get(questId);
      if (!quest) throw new QuestNotFoundError(questId);

      const idx = quest.subtasks.findIndex((s) => s.id === subtaskId);
      if (idx === -1) throw new ValidationError(`Subtask not found: ${subtaskId}`);

      const toggled: BossSubtask = { ...quest.subtasks[idx]!, done: !quest.subtasks[idx]!.done };
      const updatedSubtasks: BossSubtask[] = [...quest.subtasks];
      updatedSubtasks[idx] = toggled;

      const updated: Quest = { ...quest, subtasks: updatedSubtasks };
      await db.quests.put(updated);

      const remaining = updatedSubtasks.filter((s) => !s.done).length;
      eventBus.emit('boss:subtask:done', { quest: updated, remaining });

      if (remaining === 0 && quest.isBossQuest) {
        // Boss defeated — compute XP for the event payload
        const streak = await streakService.get();
        const xpGained = xpService.computeXp(quest.difficulty, streak.current, true);
        eventBus.emit('boss:defeated', { quest: updated, xpGained });
      }

      return updated;
    },

    /** Archive a quest (soft delete). Emits quest:archived. */
    async archiveQuest(id) {
      const quest = await db.quests.get(id);
      if (!quest) throw new QuestNotFoundError(id);

      const updated: Quest = { ...quest, status: 'archived' };
      await db.quests.put(updated);
      eventBus.emit('quest:archived', { quest: updated });
      return updated;
    },

    /** List quests, optionally filtered by status. */
    async listQuests(status?) {
      if (status) {
        return db.quests.where('status').equals(status).toArray();
      }
      return db.quests.toArray();
    },

    /** Get a single quest by ID. */
    async getQuest(id) {
      return db.quests.get(id);
    },
  };
}
