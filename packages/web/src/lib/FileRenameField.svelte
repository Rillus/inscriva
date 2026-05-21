<script lang="ts">
  import { fileBaseName, validateFileBaseName } from "@inscriva/indexer";

  interface Props {
    path: string;
    onSave: (newBase: string) => void;
    onCancel: () => void;
    class?: string;
    /** When false, show a button that enters edit mode on click. */
    alwaysEditing?: boolean;
  }

  let { path, onSave, onCancel, class: className = "", alwaysEditing = false }: Props = $props();

  let editing = $state(false);
  let draft = $state("");
  let error = $state<string | null>(null);
  let inputEl = $state<HTMLInputElement | null>(null);

  $effect(() => {
    draft = fileBaseName(path);
    error = null;
    editing = alwaysEditing;
  });

  $effect(() => {
    if (editing && inputEl) {
      inputEl.focus();
      inputEl.select();
    }
  });

  function startEditing() {
    draft = fileBaseName(path);
    error = null;
    editing = true;
  }

  function commit() {
    const validation = validateFileBaseName(draft);
    if (validation) {
      error = validation;
      return;
    }
    error = null;
    editing = alwaysEditing;
    onSave(draft.trim());
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      draft = fileBaseName(path);
      error = null;
      editing = alwaysEditing;
      onCancel();
    }
  }
</script>

<div class="rename-field {className}" class:editing>
  {#if editing || alwaysEditing}
    <input
      bind:this={inputEl}
      type="text"
      class="rename-input"
      class:invalid={!!error}
      bind:value={draft}
      aria-label="File name"
      aria-invalid={error ? "true" : undefined}
      onkeydown={handleKeydown}
      onblur={commit}
    />
    {#if error}
      <span class="rename-error" role="alert">{error}</span>
    {/if}
  {:else}
    <button type="button" class="rename-display" onclick={startEditing} title="Rename file">
      {fileBaseName(path)}
    </button>
  {/if}
</div>

<style>
  .rename-field {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    min-width: 0;
  }

  .rename-field.editing {
    flex: 1;
  }

  .rename-display {
    border: none;
    background: transparent;
    padding: 0;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: text;
    text-decoration: underline dotted transparent;
  }

  .rename-display:hover {
    text-decoration-color: currentColor;
  }

  .rename-input {
    width: 100%;
    min-width: 0;
    padding: 0.25rem 0.5rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    font: inherit;
    background: var(--bg-elevated);
    color: var(--text);
  }

  .rename-input.invalid {
    border-color: #b45309;
  }

  .rename-error {
    font-size: 0.72rem;
    color: #b45309;
  }
</style>
