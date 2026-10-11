<script lang="ts">
  /**
   * SkillList overlay panel — shows all skills with attribute badge, level,
   * and XP progress bar to next threshold (skillLevelXpThreshold from @core/types).
   */
  import type { Skill } from '@core/types';
  import { skillLevelXpThreshold } from '@core/types';

  export let skills: Skill[] = [];
  export let open = false;

  const ATTRIBUTE_COLORS: Record<string, string> = {
    body: '#e57373',
    mind: '#64b5f6',
    spirit: '#ba68c8',
    craft: '#81c784',
  };

  function progressPercent(skill: Skill): number {
    const threshold = skillLevelXpThreshold(skill.level);
    return threshold > 0 ? Math.min((skill.xp / threshold) * 100, 100) : 0;
  }

  function close() {
    open = false;
  }
</script>

{#if open}
  <div class="overlay" on:click|self={close} on:keydown={(e) => { if (e.key === 'Escape') close(); }} tabindex="-1" role="dialog" aria-label="Skill list">
    <div class="panel">
      <header>
        <h2>Skills</h2>
        <button class="close" on:click={close} aria-label="Close skill list">✕</button>
      </header>
      <ul class="skill-list">
        {#each skills as skill (skill.id)}
          <li>
            <span class="name">{skill.name}</span>
            <span class="badge" style="background: {ATTRIBUTE_COLORS[skill.attribute] ?? '#888'}">{skill.attribute}</span>
            <span class="level">Lv {skill.level}</span>
            <div class="xp-bar" title="{skill.xp} / {skillLevelXpThreshold(skill.level)} XP">
              <div class="xp-fill" style="width: {progressPercent(skill)}%"></div>
            </div>
          </li>
        {:else}
          <li class="empty">No skills yet — complete quests to earn them.</li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 100;
  }
  .panel {
    background: #1e1e2e;
    border: 1px solid #444;
    border-radius: 12px;
    padding: 1.2rem;
    min-width: 320px;
    max-width: 90vw;
    max-height: 80vh;
    overflow-y: auto;
  }
  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.8rem;
  }
  h2 {
    margin: 0;
    font-size: 1.2rem;
  }
  .close {
    background: none;
    border: none;
    color: #aaa;
    font-size: 1.2rem;
    cursor: pointer;
  }
  .skill-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  li {
    display: grid;
    grid-template-columns: 1fr auto auto;
    gap: 0.4rem 0.6rem;
    align-items: center;
    padding: 0.5rem 0;
    border-bottom: 1px solid #333;
  }
  .name {
    font-weight: 600;
  }
  .badge {
    border-radius: 4px;
    padding: 0 0.4rem;
    font-size: 0.7rem;
    color: #fff;
    text-transform: uppercase;
  }
  .level {
    font-size: 0.85rem;
    opacity: 0.8;
  }
  .xp-bar {
    grid-column: 1 / -1;
    height: 6px;
    background: #333;
    border-radius: 3px;
    overflow: hidden;
  }
  .xp-fill {
    height: 100%;
    background: #81c784;
    border-radius: 3px;
    transition: width 0.3s ease;
  }
  li.empty {
    opacity: 0.6;
    border-bottom: none;
    grid-template-columns: 1fr;
  }
</style>
