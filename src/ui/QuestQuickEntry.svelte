<script lang="ts">
  /** Schnell-Eingabeleiste: one input, Enter creates a quest. Max 2 clicks rule. */
  export let onCreate: (title: string) => void = () => {};

  let title = '';

  function submit() {
    const t = title.trim();
    if (!t) return;
    onCreate(t);
    title = '';
  }
</script>

<form class="quick-entry" on:submit|preventDefault={submit}>
  <input
    type="text"
    placeholder="New quest… (Enter to add)"
    bind:value={title}
    aria-label="New quest title"
  />
</form>

<style>
  .quick-entry input {
    width: 100%;
    box-sizing: border-box;
    padding: 0.6rem 0.8rem;
    border-radius: 8px;
    border: 1px solid #444;
    background: #24243e;
    color: inherit;
    font-size: 1rem;
  }
</style>
