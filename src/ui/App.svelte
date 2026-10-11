<script lang="ts">
  // Phase 0 placeholder: the Phaser village mounts in Phase 2.
  let ready = false;
  import { onMount } from 'svelte';
  onMount(() => {
    ready = true;
  });
</script>

<main>
  <h1>LifeAsGame II</h1>
  {#if ready}
    <p>Phase 0 skeleton — village arrives in Phase 2.</p>
  {/if}
</main>
