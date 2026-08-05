<script lang="ts">
  import type { CastCharacter } from "@inscriva/indexer";

  interface Props {
    characters: CastCharacter[];
    chapterKey?: string;
    activeCharacterId?: string;
    showExport?: boolean;
    exportBusy?: boolean;
    onExportAppearances?: () => void;
    onSelect: (character: CastCharacter) => void;
  }

  let {
    characters,
    chapterKey,
    activeCharacterId,
    showExport = false,
    exportBusy = false,
    onExportAppearances,
    onSelect,
  }: Props = $props();

  function mentionCount(character: CastCharacter): number {
    if (chapterKey) {
      return (
        character.appearances.find((a) => a.chapterKey === chapterKey)
          ?.mentionCount ?? 0
      );
    }
    return character.mentions.length;
  }
</script>

<section class="cast-panel" aria-label="Cast in chapter">
  <header>
    <p class="eyebrow">Cast</p>
    <p class="hint">Characters with mentions in this chapter.</p>
    {#if showExport && onExportAppearances}
      <button
        type="button"
        class="export-btn"
        disabled={exportBusy}
        onclick={() => onExportAppearances?.()}
      >
        {exportBusy ? "Exporting…" : "Export all appearances"}
      </button>
    {/if}
  </header>

  {#if characters.length === 0}
    <p class="empty">No character mentions detected in this chapter yet.</p>
  {:else}
    <ul class="cast-list">
      {#each characters as character (character.id)}
        <li>
          <button
            type="button"
            class="cast-row"
            class:active={character.id === activeCharacterId}
            onclick={() => onSelect(character)}
          >
            <span class="name">{character.name}</span>
            <span class="meta">{mentionCount(character)} mentions</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</section>

<style>
  .cast-panel {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    padding: 0.75rem;
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
    overflow: auto;
  }

  header .eyebrow {
    margin: 0;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .hint,
  .empty {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .export-btn {
    margin-top: 0.35rem;
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: 0.3rem 0.55rem;
    background: transparent;
    color: var(--accent);
    font-size: 0.72rem;
    cursor: pointer;
  }

  .export-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .cast-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .cast-row {
    display: flex;
    justify-content: space-between;
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

  .cast-row:hover {
    background: rgba(255, 255, 255, 0.06);
  }

  .cast-row.active {
    background: rgba(255, 255, 255, 0.12);
  }

  .name {
    font-weight: 600;
    font-size: 0.85rem;
  }

  .meta {
    font-size: 0.7rem;
    color: var(--text-muted);
  }
</style>
