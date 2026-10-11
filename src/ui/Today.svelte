<script lang="ts">
  import { bootApp, type AppContext } from '../bootstrap';
  import QuestQuickEntry from './QuestQuickEntry.svelte';
  import TodayList from './TodayList.svelte';
  import { onMount } from 'svelte';
  import type { Quest } from '@core/types';

  let ctx: AppContext | null = null;
  let error = '';
  let quests: Quest[] = [];
  let streakCurrent = 0;

  onMount(async () => {
    try {
      const c = await bootApp();
      ctx = c;
      await refresh(c);
    } catch (e) {
      error = String(e);
    }
  });

  async function refresh(c: AppContext) {
    quests = await c.quests.listQuests('open');
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
</script>

<main>
  <header>
    <h1>LifeAsGame II</h1>
    <span class="streak" title="Streak">🔥 {streakCurrent}</span>
  </header>

  {#if error}
    <p class="error">{error}</p>
  {:else if ctx}
    <QuestQuickEntry onCreate={quickCreate} />
    <TodayList {quests} onComplete={complete} onArchive={archive} />
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
  .streak {
    font-size: 1.2rem;
  }
  .error {
    color: #e57373;
  }
</style>
