<script lang="ts">
  import { bootApp, type AppContext } from '../bootstrap';
  import QuestQuickEntry from './QuestQuickEntry.svelte';
  import TodayList from './TodayList.svelte';
  import SkillList from './SkillList.svelte';
  import WeekCalendar from './WeekCalendar.svelte';
  import Toast from './Toast.svelte';
  import { onMount, onDestroy } from 'svelte';
  import type { Quest, Skill } from '@core/types';
  import { mountVillage } from '@game/main';

  let ctx: AppContext | null = null;
  let error = '';
  let quests: Quest[] = [];
  let skills: Skill[] = [];
  let streakCurrent = 0;
  let skillListOpen = false;
  let calendarOpen = false;
  let villageContainer: HTMLDivElement | undefined;
  let destroyVillage: (() => void) | undefined;

  onMount(async () => {
    try {
      const c = await bootApp();
      ctx = c;
      await refresh(c);
      // Mount village below quest UI
      if (villageContainer) {
        destroyVillage = mountVillage(villageContainer, {
          onBuildingEnter: handleBuildingEnter,
        });
      }
    } catch (e) {
      error = String(e);
    }
  });

  onDestroy(() => {
    if (destroyVillage) {
      destroyVillage();
    }
  });

  async function refresh(c: AppContext) {
    quests = await c.quests.listQuests('open');
    skills = await c.skills.list();
    const streak = await c.streaks.get();
    streakCurrent = streak.current;
  }

  async function complete(quest: Quest) {
    if (!ctx) return;
    await ctx.quests.completeQuest(quest.id);
    await refresh(ctx);
  }

  async function archive(quest: Quest) {
    if (!ctx) return;
    await ctx.quests.archiveQuest(quest.id);
    await refresh(ctx);
  }

  async function quickCreate(title: string) {
    if (!ctx) return;
    // Default category until AI matching assigns a better one (Phase 3).
    await ctx.quests.createQuest({ title, categoryId: 'productivity' });
    await refresh(ctx);
  }

  /** Village building click handler: tavern → quest list, library → skill overlay. */
  function handleBuildingEnter(buildingId: string) {
    if (buildingId === 'tavern') {
      // Quest list is already visible in Today — just scroll to it / no-op
      return;
    }
    if (buildingId === 'library') {
      skillListOpen = true;
      return;
    }
    // Other buildings: console-only for now
    console.log('[Today] Building entered:', buildingId);
  }
</script>

<main>
  <header>
    <h1>LifeAsGame II</h1>
    <div class="header-right">
      <button class="skills-btn" on:click={() => { skillListOpen = !skillListOpen; }} aria-label="Toggle skill list">Skills</button>
      <button class="skills-btn" on:click={() => { calendarOpen = !calendarOpen; }} aria-label="Toggle calendar">Calendar</button>
      <span class="streak" title="Streak">🔥 {streakCurrent}</span>
    </div>
  </header>

  {#if error}
    <p class="error">{error}</p>
  {:else if ctx}
    <QuestQuickEntry onCreate={quickCreate} />
    <TodayList {quests} onComplete={complete} onArchive={archive} />
    <section>
      <div bind:this={villageContainer} id="village" style="height: 480px; border: 1px solid #555; margin-top: 1rem;"></div>
    </section>
    <SkillList {skills} bind:open={skillListOpen} />
    <WeekCalendar calendar={ctx.calendar} questService={ctx.quests} bind:open={calendarOpen} />
    <Toast bus={ctx.bus} {skills} />
  {:else}
    <p>Loading…</p>
  {/if}
</main>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .header-right {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .skills-btn {
    background: none;
    border: 1px solid #666;
    border-radius: 6px;
    color: inherit;
    padding: 0.2rem 0.6rem;
    cursor: pointer;
    font-size: 0.85rem;
  }
  .skills-btn:hover {
    border-color: #aaa;
  }
  .streak {
    font-size: 1.2rem;
  }
  .error {
    color: #e57373;
  }
</style>
