<script lang="ts">
  import type { BookIndexChapter, ChapterPair } from "@inscriva/indexer";
  import { isChapterWorkflowComplete } from "@inscriva/indexer";

  interface Props {
    pairs: ChapterPair[];
    indexChapters?: BookIndexChapter[];
    activeKey?: string;
    onSelect: (key: string) => void;
  }

  let { pairs, indexChapters = [], activeKey, onSelect }: Props = $props();

  function meta(key: string) {
    return indexChapters.find((c) => c.key === key);
  }

  function statusLabel(key: string): string {
    const chapter = meta(key);
    return chapter?.outlineStatus ?? "Not set";
  }

  function statusClass(key: string): string {
    const status = statusLabel(key);
    if (isChapterWorkflowComplete(status)) return "complete";
    if (status === "Not set") return "unset";
    return "in-progress";
  }
</script>

<section class="chapter-board" aria-label="Chapter board">
  <header>
    <h2>Chapter board</h2>
    <p class="hint">Overview by outline status and draft progress.</p>
  </header>

  <div class="grid">
    {#each pairs as pair (pair.key)}
      {@const chapter = meta(pair.key)}
      <button
        type="button"
        class="card"
        class:active={pair.key === activeKey}
        data-status={statusClass(pair.key)}
        onclick={() => onSelect(pair.key)}
      >
        <span class="key">{pair.key}</span>
        <span class="title">{chapter?.title ?? pair.title ?? pair.key}</span>
        <span class="status">{statusLabel(pair.key)}</span>
        <span class="words">{chapter?.draftWordCount ?? 0} words</span>
        {#if chapter?.alignmentSummary}
          <span class="alignment" data-level={chapter.alignmentSummary}>
            {chapter.alignmentSummary}
          </span>
        {/if}
      </button>
    {/each}
  </div>
</section>

<style>
  .chapter-board {
    padding: 0.75rem;
    overflow: auto;
  }

  header h2 {
    margin: 0;
    font-size: 0.95rem;
  }

  .hint {
    margin: 0.25rem 0 0.75rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9rem, 1fr));
    gap: 0.5rem;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.55rem 0.6rem;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--bg-elevated);
    text-align: left;
    cursor: pointer;
    color: inherit;
  }

  .card:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .card.active {
    border-color: var(--accent);
    box-shadow: 0 0 0 1px var(--accent);
  }

  .card[data-status="complete"] {
    border-left: 3px solid #22c55e;
  }

  .card[data-status="in-progress"] {
    border-left: 3px solid #fbbf24;
  }

  .key {
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .title {
    font-size: 0.82rem;
    font-weight: 600;
    line-height: 1.3;
  }

  .status {
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .words {
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .alignment {
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .alignment[data-level="warnings"] {
    color: #fbbf24;
  }

  .alignment[data-level="stale"] {
    color: #93c5fd;
  }
</style>
