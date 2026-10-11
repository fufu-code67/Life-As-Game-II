<script lang="ts">
  /** Heute-Liste: open quests, complete/archive in one click. */
  import type { Quest } from '@core/types';

  export let quests: Quest[] = [];
  export let onComplete: (quest: Quest) => void = () => {};
  export let onArchive: (quest: Quest) => void = () => {};
</script>

<ul class="today-list">
  {#each quests as quest (quest.id)}
    <li>
      <span class="title">{quest.title}</span>
      {#if quest.isBossQuest}
        <span class="badge boss">BOSS</span>
      {/if}
      <span class="difficulty">{quest.difficulty}</span>
      <button class="done" on:click={() => onComplete(quest)} aria-label="Complete quest">✓</button>
      <button class="archive" on:click={() => onArchive(quest)} aria-label="Archive quest">🗄</button>
    </li>
  {:else}
    <li class="empty">No open quests — add one above.</li>
  {/each}
</ul>

<style>
  .today-list {
    list-style: none;
    padding: 0;
  }
  li {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #333;
  }
  .title {
    flex: 1;
  }
  .difficulty {
    opacity: 0.6;
    font-size: 0.85rem;
  }
  .badge.boss {
    background: #7b1fa2;
    border-radius: 4px;
    padding: 0 0.4rem;
    font-size: 0.75rem;
  }
  button {
    background: none;
    border: 1px solid #555;
    border-radius: 6px;
    cursor: pointer;
  }
  button.done {
    color: #81c784;
  }
  li.empty {
    opacity: 0.6;
    border-bottom: none;
  }
</style>
