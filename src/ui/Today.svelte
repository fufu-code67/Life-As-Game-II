<script lang="ts">
  import { bootApp, type AppContext } from '../bootstrap';
  import QuestQuickEntry from './QuestQuickEntry.svelte';
  import TodayList from './TodayList.svelte';
  import { onMount, onDestroy } from 'svelte';
  import type { Quest } from '@core/types';
  import { mountVillage } from '@game/main';

  let ctx: AppContext | null = null;
  let error = '';
  let quests: Quest[] = [];
  let streakCurrent = 0;
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
          onBuildingEnter: (id) => console.log('[Today] Building entered:', id),
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
    <section>
      <div bind:this={villageContainer} id="village" style="height: 480px; border: 1px solid #555; margin-top: 1rem;"></div>
    </section>
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
