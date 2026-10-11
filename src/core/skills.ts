/**
 * Skill service — list/get, map quests to skills (exact match then AI), create from AI proposals.
 */

import type { Skill, SkillAttribute, EventBus } from '@core/types';
import type { SkillService } from '@core/services';
import type { LagDB } from '@core/db';
import { normalizeSkillName } from '@ai/normalize';

const ALLOWED_ATTRIBUTES: readonly SkillAttribute[] = ['body', 'mind', 'spirit', 'craft'];

export function createSkillService(db: LagDB, eventBus: EventBus): SkillService {
  return {
    async list() {
      return db.skills.toArray();
    },

    async get(id) {
      return db.skills.get(id);
    },

    /**
     * Map a completed quest to a skill.
     * Level 1: exact normalized-name match against existing skills.
     * Level 2: one AI call via the injected matcher.
     * On AI failure: emits ai:skillmatch:failed and returns null (safe fallback).
     * Emits skill:mapped (+ skill:created if a new skill was made).
     */
    async mapQuestToSkill(questId, matcher) {
      const quest = await db.quests.get(questId);
      if (!quest) return null;

      // Level 1: exact normalized-name match
      const allSkills = await db.skills.toArray();
      const questNorm = normalizeSkillName(quest.title);
      const exactMatch = allSkills.find((s) => normalizeSkillName(s.name) === questNorm);

      if (exactMatch) {
        await db.quests.update(questId, { skillId: exactMatch.id });
        eventBus.emit('skill:mapped', { questId, skillId: exactMatch.id, createdSkill: false });
        return { skillId: exactMatch.id, createdSkill: false };
      }

      // Level 2: AI matcher
      try {
        const result = await matcher(quest.title, quest.description);

        if (result.existingSkillId) {
          await db.quests.update(questId, { skillId: result.existingSkillId });
          eventBus.emit('skill:mapped', {
            questId,
            skillId: result.existingSkillId,
            createdSkill: false,
          });
          return { skillId: result.existingSkillId, createdSkill: false };
        }

        if (result.newSkill) {
          const newSkill = await this.createFromAIProposal(result.newSkill);
          await db.quests.update(questId, { skillId: newSkill.id });
          eventBus.emit('skill:mapped', { questId, skillId: newSkill.id, createdSkill: true });
          return { skillId: newSkill.id, createdSkill: true };
        }

        // No match found at all
        return null;
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        eventBus.emit('ai:skillmatch:failed', { questId, reason });
        return null;
      }
    },

    /** Create a skill from an AI proposal with normalization applied. Validates attribute (fallback: 'mind'). Emits skill:created. */
    async createFromAIProposal(proposal) {
      const name = normalizeSkillName(proposal.name);
      const attribute: SkillAttribute = (ALLOWED_ATTRIBUTES as readonly string[]).includes(
        proposal.attribute,
      )
        ? (proposal.attribute as SkillAttribute)
        : 'mind';

      const skill: Skill = {
        id: crypto.randomUUID(),
        name,
        description: proposal.description,
        attribute,
        icon: proposal.icon,
        level: 1,
        xp: 0,
        createdAt: Date.now(),
      };

      await db.skills.add(skill);
      eventBus.emit('skill:created', { skill });
      return skill;
    },
  };
}
