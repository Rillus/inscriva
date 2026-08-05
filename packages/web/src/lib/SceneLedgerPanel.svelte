<script lang="ts">
  interface Props {
    chapterKey: string;
    suggestions: string[];
    busy?: boolean;
    onAppend: () => void | Promise<void>;
    onOpenLedger?: () => void;
  }

  let {
    chapterKey,
    suggestions,
    busy = false,
    onAppend,
    onOpenLedger,
  }: Props = $props();
</script>

<section class="scene-ledger" aria-label="Scene ledger suggestions">
  <header>
    <h3>Scene ledger</h3>
    <p class="hint">
      Deterministic suggestions from <code>## Scene N — …</code> headings in this draft.
    </p>
  </header>

  {#if suggestions.length === 0}
    <p class="empty">No scene headings detected in the draft yet.</p>
  {:else}
    <ul>
      {#each suggestions as scene (scene)}
        <li>{scene}</li>
      {/each}
    </ul>
    <div class="actions">
      <button type="button" class="primary" disabled={busy} onclick={() => onAppend()}>
        {busy ? "Appending…" : `Append ${suggestions.length} to Scene Ledger`}
      </button>
      {#if onOpenLedger}
        <button type="button" disabled={busy} onclick={() => onOpenLedger?.()}>
          Open ledger
        </button>
      {/if}
    </div>
  {/if}
</section>

<style>
  .scene-ledger {
    margin: 0.75rem 1rem;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-elevated);
    font-size: 0.82rem;
  }

  h3 {
    margin: 0 0 0.25rem;
    font-size: 0.85rem;
  }

  .hint,
  .empty {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.4;
  }

  ul {
    margin: 0 0 0.5rem;
    padding-left: 1.1rem;
  }

  .actions {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .primary {
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: 0.35rem 0.6rem;
    background: var(--accent);
    color: #fff;
    font-size: 0.78rem;
  }

  .actions button:not(.primary) {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.35rem 0.6rem;
    background: transparent;
    font-size: 0.78rem;
  }
</style>
