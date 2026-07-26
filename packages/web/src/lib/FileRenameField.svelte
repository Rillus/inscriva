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

  let {
    path,
    onSave,
    onCancel,
    class: className = "",
    alwaysEditing = false,
  }: Props = $props();

  let editing = $state(false);
  let draft = $state("");
  let error = $state<string | null>(null);
  let inputEl = $state<HTMLInputElement | null>(null);
  /** Avoid committing on blur fired during mount/focus hand-off. */
  let blurCommitReady = $state(false);

  $effect(() => {
    draft = fileBaseName(path);
    if (!editing) error = null;
  });

  $effect(() => {
    if (!alwaysEditing) return;
    editing = true;
    blurCommitReady = false;
    const id = requestAnimationFrame(() => {
      blurCommitReady = true;
    });
    return () => cancelAnimationFrame(id);
  });

  $effect(() => {
    if (editing && inputEl) {
      inputEl.focus();
      inputEl.select();
    }
  });

  function armBlurCommit() {
    blurCommitReady = false;
    requestAnimationFrame(() => {
      blurCommitReady = true;
    });
  }

  function startEditing() {
    draft = fileBaseName(path);
    error = null;
    editing = true;
    armBlurCommit();
  }

  function commit() {
    const validation = validateFileBaseName(draft);
    if (validation) {
      error = validation;
      return;
    }
    error = null;
    if (!alwaysEditing) editing = false;
    onSave(draft.trim());
  }

  function handleBlur() {
    if (!blurCommitReady) return;
    commit();
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      draft = fileBaseName(path);
      error = null;
      if (!alwaysEditing) editing = false;
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
      onblur={handleBlur}
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
    padding: 0.15rem 0.25rem;
    margin: -0.15rem -0.25rem;
    font: inherit;
    color: inherit;
    text-align: left;
    cursor: text;
    border-radius: 4px;
    text-decoration: underline;
    text-decoration-color: rgba(232, 200, 150, 0.55);
    text-underline-offset: 3px;
  }

  .rename-display:hover,
  .rename-display:focus-visible {
    background: rgba(232, 200, 150, 0.18);
    text-decoration-color: #e8c896;
    outline: 2px solid rgba(232, 200, 150, 0.45);
    outline-offset: 2px;
  }

  .rename-input {
    width: 100%;
    min-width: 0;
    padding: 0.35rem 0.5rem;
    border: 2px solid var(--rename-border, var(--border-on-paper, var(--border)));
    border-radius: 4px;
    font: inherit;
    background: var(--rename-bg, var(--bg-elevated));
    color: var(--rename-fg, var(--ink-on-paper, var(--text)));
    box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.06);
  }

  .rename-input:focus {
    outline: none;
    border-color: var(--rename-focus, var(--accent, #8b6914));
    box-shadow: 0 0 0 2px var(--rename-focus-ring, rgba(139, 105, 20, 0.25));
  }

  .rename-input.invalid {
    border-color: #c2410c;
    box-shadow: 0 0 0 2px rgba(194, 65, 12, 0.2);
  }

  .rename-error {
    font-size: 0.72rem;
    color: #ea580c;
    font-weight: 500;
  }
</style>
