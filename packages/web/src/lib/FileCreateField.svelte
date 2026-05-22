<script lang="ts">
  import { validateFileBaseName } from "@inscriva/indexer";

  interface Props {
    directory: string;
    onSave: (base: string) => void;
    onCancel: () => void;
  }

  let { directory, onSave, onCancel }: Props = $props();

  let draft = $state("");
  let error = $state<string | null>(null);
  let inputEl = $state<HTMLInputElement | null>(null);

  $effect(() => {
    directory;
    draft = "";
    error = null;
    inputEl?.focus();
  });

  $effect(() => {
    if (inputEl) {
      inputEl.focus();
    }
  });

  function commit() {
    const validation = validateFileBaseName(draft);
    if (validation) {
      error = validation;
      return;
    }
    error = null;
    onSave(draft.trim());
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      draft = "";
      error = null;
      onCancel();
    }
  }
</script>

<div class="create-field">
  <p class="create-hint">
    {#if directory}
      New file in {directory}/
    {:else}
      New file in book root
    {/if}
  </p>
  <input
    bind:this={inputEl}
    type="text"
    class="create-input"
    class:invalid={!!error}
    bind:value={draft}
    placeholder="File name"
    aria-label="New file name"
    aria-invalid={error ? "true" : undefined}
    onkeydown={handleKeydown}
    onblur={commit}
  />
  {#if error}
    <span class="create-error" role="alert">{error}</span>
  {/if}
</div>

<style>
  .create-field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.5rem 0.5rem 0.35rem;
    border-bottom: 1px solid var(--border);
  }

  .create-hint {
    margin: 0;
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .create-input {
    width: 100%;
    min-width: 0;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    font: inherit;
    background: var(--bg-elevated);
    color: var(--text);
  }

  .create-input.invalid {
    border-color: #b45309;
  }

  .create-error {
    font-size: 0.72rem;
    color: #b45309;
  }
</style>
