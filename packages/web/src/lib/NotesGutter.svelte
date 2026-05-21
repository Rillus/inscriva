<script lang="ts">
  import type { LineNote } from "@inscriva/indexer";

  interface Props {
    notes: LineNote[];
    activeAnchorId?: string;
    onSelect: (anchorId: string) => void;
    onAdd?: (text: string) => void;
  }

  let { notes, activeAnchorId, onSelect, onAdd }: Props = $props();

  let draft = $state("");

  function submit() {
    if (!draft.trim() || !onAdd) return;
    onAdd(draft.trim());
    draft = "";
  }
</script>

<aside class="notes-gutter" aria-label="Line notes">
  <header>
    <h3>Notes</h3>
    <span class="count">{notes.length}</span>
  </header>

  <ul>
    {#each notes as note}
      <li>
        <button
          type="button"
          class:active={note.anchorId === activeAnchorId}
          onclick={() => onSelect(note.anchorId)}
        >
          <span class="type">{note.type}</span>
          <span class="text">{note.text}</span>
        </button>
      </li>
    {:else}
      <li class="empty">No notes on this paragraph yet.</li>
    {/each}
  </ul>

  {#if onAdd}
    <form
      class="add"
      onsubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <textarea bind:value={draft} placeholder="Add a note…" rows="2"></textarea>
      <button type="submit" disabled={!draft.trim()}>Add</button>
    </form>
  {/if}
</aside>

<style>
  .notes-gutter {
    display: flex;
    flex-direction: column;
    width: 220px;
    border-left: 1px solid var(--border);
    background: var(--bg-muted);
    font-size: 0.8rem;
    overflow: hidden;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem;
    border-bottom: 1px solid var(--border);
  }

  header h3 {
    margin: 0;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .count {
    color: var(--text-muted);
  }

  ul {
    flex: 1;
    margin: 0;
    padding: 0.5rem;
    list-style: none;
    overflow-y: auto;
  }

  li button {
    width: 100%;
    text-align: left;
    border: none;
    background: transparent;
    padding: 0.5rem;
    border-radius: 6px;
    cursor: pointer;
  }

  li button.active,
  li button:hover {
    background: var(--bg-muted);
  }

  .type {
    display: block;
    font-size: 0.65rem;
    text-transform: uppercase;
    color: var(--accent);
    margin-bottom: 0.2rem;
  }

  .text {
    color: var(--text);
    line-height: 1.35;
  }

  .empty {
    padding: 0.5rem;
    color: var(--text-muted);
    font-style: italic;
  }

  .add {
    padding: 0.5rem;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  textarea {
    font: inherit;
    font-size: 0.8rem;
    padding: 0.4rem;
    border: 1px solid var(--border);
    border-radius: 4px;
    resize: vertical;
  }

  .add button {
    align-self: flex-end;
    border: none;
    background: var(--accent);
    color: #fff;
    padding: 0.3rem 0.65rem;
    border-radius: 4px;
    font-size: 0.75rem;
  }
</style>
