<script lang="ts">
  import type { CastCharacter } from "@inscriva/indexer";

  interface Props {
    character: CastCharacter;
    chapterKey?: string;
    onJumpToMention?: (draftPath: string, offset: number) => void;
    onOpenBible?: (path: string) => void;
    onSummariseArc?: () => void;
    onclose: () => void;
  }

  let {
    character,
    chapterKey,
    onJumpToMention,
    onOpenBible,
    onSummariseArc,
    onclose,
  }: Props = $props();

  const appearances = $derived(
    chapterKey
      ? character.appearances.filter((a) => a.chapterKey === chapterKey)
      : character.appearances,
  );

  const mentions = $derived(
    chapterKey
      ? character.mentions.filter((m) => m.chapterKey === chapterKey)
      : character.mentions,
  );

  const dialogue = $derived(
    chapterKey
      ? character.dialogue.filter((d) => d.chapterKey === chapterKey)
      : character.dialogue,
  );

  const bibleFilePath = $derived(character.biblePath.split("#")[0] ?? character.biblePath);
</script>

<aside class="character-sheet" aria-label="Character sheet">
  <header>
    <div>
      <p class="eyebrow">Character sheet</p>
      <h2>{character.name}</h2>
      {#if character.aliases.length}
        <p class="aliases">Also: {character.aliases.join(", ")}</p>
      {/if}
    </div>
    <button type="button" class="close" onclick={onclose} aria-label="Close sheet">×</button>
  </header>

  <section>
    <h3>Bible</h3>
    <p>{character.bibleExcerpt || "No excerpt available."}</p>
    <button type="button" class="link" onclick={() => onOpenBible?.(bibleFilePath)}>
      Open {bibleFilePath}
    </button>
  </section>

  <section>
    <h3>Appearances</h3>
    {#if appearances.length === 0}
      <p class="muted">No appearances recorded yet.</p>
    {:else}
      <table>
        <thead>
          <tr>
            <th>Chapter</th>
            <th>Mentions</th>
            <th>Words</th>
          </tr>
        </thead>
        <tbody>
          {#each appearances as row (row.chapterKey)}
            <tr>
              <td>{row.chapterKey}</td>
              <td>{row.mentionCount}</td>
              <td>{row.draftWordCount}</td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </section>

  <section>
    <h3>Mentions</h3>
    {#if mentions.length === 0}
      <p class="muted">No mention snippets yet.</p>
    {:else}
      <ul class="mentions">
        {#each mentions.slice(0, 12) as mention (mention.offset + mention.draftPath)}
          <li>
            <button
              type="button"
              class="mention"
              onclick={() => onJumpToMention?.(mention.draftPath, mention.offset)}
            >
              <span class="chapter">{mention.chapterKey}</span>
              <span class="snippet">…{mention.snippet}…</span>
            </button>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  <section>
    <h3>Dialogue</h3>
    {#if dialogue.length === 0}
      <p class="muted">No attributed dialogue detected.</p>
    {:else}
      <ul class="dialogue">
        {#each dialogue as line (line.quote + line.chapterKey)}
          <li>
            <span class="chapter">{line.chapterKey}</span>
            <blockquote>{line.quote}</blockquote>
          </li>
        {/each}
      </ul>
    {/if}
  </section>

  {#if onSummariseArc}
    <footer>
      <button type="button" class="primary" onclick={onSummariseArc}>
        Summarise character arc
      </button>
      <p class="muted">Opt-in Assist task — does not edit the bible automatically.</p>
    </footer>
  {/if}
</aside>

<style>
  .character-sheet {
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
    min-height: 0;
    padding: 0.75rem;
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
    overflow: auto;
  }

  header {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
  }

  h2 {
    margin: 0.15rem 0 0;
    font-size: 1rem;
  }

  h3 {
    margin: 0 0 0.35rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
  }

  .eyebrow {
    margin: 0;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .aliases,
  .muted {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .close {
    border: none;
    background: transparent;
    font-size: 1.2rem;
    color: var(--text-muted);
  }

  section p {
    margin: 0;
    line-height: 1.45;
    font-size: 0.85rem;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
  }

  th,
  td {
    padding: 0.25rem 0.35rem;
    border-bottom: 1px solid var(--border);
    text-align: left;
  }

  .mentions,
  .dialogue {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .mention {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    width: 100%;
    padding: 0.4rem 0;
    border: none;
    border-bottom: 1px solid var(--border);
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .mention:hover {
    background: rgba(255, 255, 255, 0.04);
  }

  .chapter {
    font-size: 0.68rem;
    text-transform: uppercase;
    color: var(--text-muted);
  }

  .snippet,
  blockquote {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.4;
  }

  blockquote {
    padding-left: 0.65rem;
    border-left: 2px solid var(--border);
    font-style: italic;
  }

  .link {
    margin-top: 0.35rem;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--accent);
    font-size: 0.75rem;
    cursor: pointer;
  }

  footer {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    padding-top: 0.35rem;
    border-top: 1px solid var(--border);
  }

  .primary {
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: 0.4rem 0.65rem;
    background: var(--accent);
    color: #fff;
    font-size: 0.8rem;
  }
</style>
