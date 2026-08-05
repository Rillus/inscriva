<script lang="ts">
  import {
    findMasterChapterAtOffset,
    MASTER_OUTLINE_FORMAT_GUIDE,
    parseMasterOutline,
    type MasterChapterEntry,
  } from "@inscriva/indexer";

  interface Props {
    masterMarkdown: string;
    caretOffset: number;
    onExpand: (entry: MasterChapterEntry) => void;
    onReconcile?: () => void;
    reconcileBusy?: boolean;
  }

  let {
    masterMarkdown,
    caretOffset,
    onExpand,
    onReconcile,
    reconcileBusy = false,
  }: Props = $props();

  const chapters = $derived(parseMasterOutline(masterMarkdown).chapters);
  const atCaret = $derived(findMasterChapterAtOffset(masterMarkdown, caretOffset));
  let showGuide = $state(false);
</script>

<aside class="master-bar" aria-label="Book outline tools">
  <div class="row">
    <p class="label">
      {#if atCaret}
        Chapter beat: <strong>{atCaret.key}</strong> — {atCaret.title}
      {:else if chapters.length}
        Place the caret inside a <code>## ChNN — Title</code> block.
      {:else}
        Add <code>## Ch01 — Title</code> blocks so Inscriva can read your book outline.
      {/if}
    </p>
    <button
      type="button"
      class="expand"
      disabled={!atCaret}
      onclick={() => atCaret && onExpand(atCaret)}
    >
      Expand into chapter outline
    </button>
    {#if onReconcile}
      <button
        type="button"
        class="reconcile"
        disabled={reconcileBusy}
        onclick={() => onReconcile?.()}
      >
        {reconcileBusy ? "Syncing…" : "Sync chapter statuses"}
      </button>
    {/if}
  </div>
  <button
    type="button"
    class="guide-toggle"
    onclick={() => (showGuide = !showGuide)}
  >
    {showGuide ? "Hide" : "Show"} book-outline format
  </button>
  {#if showGuide}
    <pre class="guide">{MASTER_OUTLINE_FORMAT_GUIDE}</pre>
  {/if}
</aside>

<style>
  .master-bar {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
    font-size: 0.8rem;
  }

  .row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .label {
    margin: 0;
    color: var(--text-muted);
  }

  .expand {
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .expand:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .reconcile {
    padding: 0.35rem 0.65rem;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: transparent;
    color: inherit;
    font-size: 0.78rem;
    cursor: pointer;
  }

  .reconcile:disabled {
    opacity: 0.5;
  }

  .guide-toggle {
    margin-top: 0.35rem;
    padding: 0;
    border: none;
    background: none;
    color: var(--text-muted);
    font-size: 0.72rem;
    text-decoration: underline;
    cursor: pointer;
  }

  .guide {
    margin: 0.5rem 0 0;
    padding: 0.5rem 0.65rem;
    border-radius: 6px;
    background: var(--bg-muted);
    font-size: 0.7rem;
    line-height: 1.4;
    white-space: pre-wrap;
  }

  code {
    font-size: 0.85em;
  }
</style>
