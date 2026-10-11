<script lang="ts">
  /**
   * Minimal toast — listens to bus events for skill mapping feedback.
   * Auto-hides after 3 seconds.
   */
  import { onMount, onDestroy } from 'svelte';
  import type { EventBus, Skill } from '@core/types';

  export let bus: EventBus | null = null;
  export let skills: Skill[] = [];

  interface ToastMessage {
    id: number;
    text: string;
    timer: ReturnType<typeof setTimeout>;
  }

  let messages: ToastMessage[] = [];
  let nextId = 0;

  function addToast(text: string): void {
    const id = nextId++;
    const timer = setTimeout(() => {
      messages = messages.filter((m) => m.id !== id);
    }, 3000);
    messages = [...messages, { id, text, timer }];
  }

  function skillName(skillId: string): string {
    return skills.find((s) => s.id === skillId)?.name ?? skillId;
  }

  let offMapped: (() => void) | undefined;
  let offCreated: (() => void) | undefined;
  let offFailed: (() => void) | undefined;

  onMount(() => {
    if (!bus) return;
    offMapped = bus.on('skill:mapped', (payload) => {
      addToast(`Skill mapped: ${skillName(payload.skillId)}`);
    });
    offCreated = bus.on('skill:created', (payload) => {
      addToast(`New skill: ${payload.skill.name}`);
    });
    offFailed = bus.on('ai:skillmatch:failed', () => {
      addToast('Skill mapping deferred');
    });
  });

  onDestroy(() => {
    offMapped?.();
    offCreated?.();
    offFailed?.();
    for (const m of messages) clearTimeout(m.timer);
  });
</script>

{#if messages.length > 0}
  <div class="toast-container" aria-live="polite">
    {#each messages as msg (msg.id)}
      <div class="toast">{msg.text}</div>
    {/each}
  </div>
{/if}

<style>
  .toast-container {
    position: fixed;
    bottom: 1rem;
    right: 1rem;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .toast {
    background: #333;
    color: #eee;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    font-size: 0.9rem;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
    animation: fade-in 0.2s ease;
  }
  @keyframes fade-in {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
