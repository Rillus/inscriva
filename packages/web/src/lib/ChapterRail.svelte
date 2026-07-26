<script lang="ts">
  import {
    isChapterWorkflowComplete,
    type BookIndexChapter,
    type ChapterPair,
  } from "@inscriva/indexer";

  interface Props {
    pairs: ChapterPair[];
    indexChapters?: BookIndexChapter[];
    activeKey?: string;
    masterOutlinePath?: string;
    onSelect: (key: string) => void;
    onOpenBookOutline?: () => void;
  }

  let {
    pairs,
    indexChapters = [],
    activeKey,
    masterOutlinePath,
    onSelect,
    onOpenBookOutline,
  }: Props = $props();

  function rowMeta(key: string) {
    return indexChapters.find((c) => c.key === key);
  }

  function badge(key: string): string | null {
    const meta = rowMeta(key);
    if (!meta?.alignmentSummary) return null;
    if (isChapterWorkflowComplete(meta.outlineStatus)) return null;
    return meta.alignmentSummary;
  }

  function isComplete(key: string): boolean {
    const meta = rowMeta(key);
    return isChapterWorkflowComplete(meta?.outlineStatus);
  }
</script>

<nav class="chapter-rail" aria-label="Chapters">
  <header>
    <p class="eyebrow">Chapters</p>
  </header>
  {#if masterOutlinePath}
    <button
      type="button"
      class="book-outline"
      onclick={() => onOpenBookOutline?.()}
    >
      Book outline
    </button>
  {/if}
  <ol class="chapter-list">
    {#each pairs as pair (pair.key)}
      {@const meta = rowMeta(pair.key)}
      {@const displayTitle = meta?.title ?? pair.title}
      <li>
        <button
          type="button"
          class="chapter-row"
          class:active={pair.key === activeKey}
          onclick={() => onSelect(pair.key)}
        >
          <span class="key">{pair.key}</span>
          {#if displayTitle && displayTitle !== pair.key}
            <span class="title">{displayTitle}</span>
          {/if}
          {#if meta}
            <span class="words">{meta.draftWordCount}w</span>
          {/if}
          {#if isComplete(pair.key)}
            <span
              class="complete"
              title="Outline status: {meta?.outlineStatus}"
            >{meta?.outlineStatus ?? "Done"}</span>
          {:else if badge(pair.key)}
            <span class="badge" data-status={badge(pair.key)}>{badge(pair.key)}</span>
          {/if}
        </button>
      </li>
    {/each}
  </ol>
</nav>

<style>
  .chapter-rail {
    padding: 0.75rem 0.5rem;
    font-size: 0.85rem;
  }

  .book-outline {
    display: block;
    width: calc(100% - 0.5rem);
    margin: 0 0 0.5rem 0.25rem;
    padding: 0.4rem 0.5rem;
    border: 1px dashed var(--border);
    border-radius: 6px;
    background: transparent;
    color: inherit;
    font-size: 0.78rem;
    text-align: left;
    cursor: pointer;
  }

  .book-outline:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .eyebrow {
    margin: 0 0 0.5rem 0.5rem;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-on-leather-subtle, var(--text-muted));
  }

  .chapter-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .chapter-row {
    display: grid;
    grid-template-columns: auto 1fr auto auto;
    gap: 0.35rem 0.5rem;
    align-items: center;
    width: 100%;
    padding: 0.45rem 0.5rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .chapter-row:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .chapter-row.active {
    background: rgba(255, 255, 255, 0.12);
  }

  .key {
    font-weight: 600;
    font-size: 0.75rem;
  }

  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .words {
    font-size: 0.7rem;
    color: var(--text-on-leather-subtle, var(--text-muted));
  }

  .badge {
    font-size: 0.6rem;
    text-transform: uppercase;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    background: rgba(0, 0, 0, 0.2);
  }

  .badge[data-status="warnings"] {
    color: #fbbf24;
  }

  .badge[data-status="stale"] {
    color: #93c5fd;
  }

  .complete {
    font-size: 0.65rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    background: rgba(34, 197, 94, 0.2);
    color: #86efac;
  }
</style>
