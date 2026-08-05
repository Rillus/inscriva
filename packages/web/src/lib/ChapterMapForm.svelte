<script lang="ts">
  import type { ChapterMapOverrides, ChapterPair } from "@inscriva/indexer";

  interface Props {
    pair: ChapterPair;
    filePaths: string[];
    overrides: ChapterMapOverrides;
    onSave: (map: ChapterMapOverrides) => void | Promise<void>;
  }

  let { pair, filePaths, overrides, onSave }: Props = $props();

  let open = $state(false);
  let draftPath = $state(pair.draft ?? "");
  let outlinePath = $state(pair.outline ?? "");

  $effect(() => {
    draftPath = overrides[pair.key]?.draft ?? pair.draft ?? "";
    outlinePath = overrides[pair.key]?.outline ?? pair.outline ?? "";
  });

  const outlineOptions = $derived(
    filePaths.filter((p) => p.includes("Chapter Outlines/")),
  );
  const draftOptions = $derived(
    filePaths.filter((p) => p.includes("Drafts/Chapters/")),
  );

  async function savePairing() {
    const next = { ...overrides };
    const entry = {
      draft: draftPath || undefined,
      outline: outlinePath || undefined,
    };
    if (!entry.draft && !entry.outline) {
      delete next[pair.key];
    } else {
      next[pair.key] = entry;
    }
    await onSave(next);
    open = false;
  }

  function clearOverride() {
    draftPath = pair.draft ?? "";
    outlinePath = pair.outline ?? "";
    const next = { ...overrides };
    delete next[pair.key];
    void onSave(next);
    open = false;
  }
</script>

<div class="chapter-map">
  <button type="button" class="toggle" onclick={() => (open = !open)}>
    {open ? "Hide pairing" : "Edit pairing"}
  </button>

  {#if open}
    <form
      class="form"
      onsubmit={(e) => {
        e.preventDefault();
        void savePairing();
      }}
    >
      <label>
        Outline file
        <select bind:value={outlinePath}>
          <option value="">(auto-detected)</option>
          {#each outlineOptions as path}
            <option value={path}>{path.split("/").pop()}</option>
          {/each}
        </select>
      </label>
      <label>
        Draft file
        <select bind:value={draftPath}>
          <option value="">(auto-detected)</option>
          {#each draftOptions as path}
            <option value={path}>{path.split("/").pop()}</option>
          {/each}
        </select>
      </label>
      <div class="actions">
        <button type="submit" class="primary">Save pairing</button>
        <button type="button" onclick={clearOverride}>Reset to auto</button>
      </div>
      <p class="hint">Overrides are stored in <code>.inscriva/chapter-map.json</code>.</p>
    </form>
  {/if}
</div>

<style>
  .chapter-map {
    margin: 0.5rem 0.25rem 0;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }

  .toggle {
    width: 100%;
    padding: 0.35rem 0.5rem;
    border: 1px dashed var(--border);
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font-size: 0.72rem;
    cursor: pointer;
  }

  .form {
    display: flex;
    flex-direction: column;
    gap: 0.45rem;
    margin-top: 0.45rem;
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  select {
    font: inherit;
    font-size: 0.75rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.3rem 0.4rem;
    background: var(--surface-input);
    color: var(--text);
  }

  .actions {
    display: flex;
    gap: 0.35rem;
  }

  .primary {
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    background: var(--accent);
    color: #fff;
    font-size: 0.72rem;
  }

  .actions button:not(.primary) {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.3rem 0.5rem;
    background: transparent;
    font-size: 0.72rem;
  }

  .hint {
    margin: 0;
    font-size: 0.65rem;
    color: var(--text-muted);
  }
</style>
