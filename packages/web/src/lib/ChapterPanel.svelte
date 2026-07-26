<script lang="ts">
  import type { ChapterFocus } from "./outline-parser.js";

  interface Props {
    focus: ChapterFocus;
    chapterTitle: string;
    showBanner?: boolean;
  }

  let { focus, chapterTitle, showBanner = false }: Props = $props();
</script>

<aside class="chapter-panel" aria-label="Chapter focus">
  <header>
    <p class="eyebrow">Chapter focus</p>
    <h2>{chapterTitle}</h2>
    {#if focus.status}
      <p class="status" title="From outline ## Status or front matter status:">
        <span class="status-label">Status</span>
        <strong>{focus.status}</strong>
      </p>
    {:else}
      <p class="status missing" title="Add ## Status or status: in the outline to track workflow">
        <span class="status-label">Status</span>
        <span>Not set</span>
      </p>
    {/if}
  </header>

  {#if showBanner && (focus.turnByChapterEnd ?? focus.turn)}
    <p class="banner">{focus.turnByChapterEnd ?? focus.turn}</p>
  {/if}

  {#if focus.storyQuestion}
    <section>
      <h3>Story question</h3>
      <p>{focus.storyQuestion}</p>
    </section>
  {/if}

  {#if focus.scenes.length}
    <section>
      <h3>Scenes</h3>
      <ol>
        {#each focus.scenes as scene (scene.label)}
          <li>{scene.label}</li>
        {/each}
      </ol>
    </section>
  {/if}

  {#if focus.mustInclude.length}
    <section>
      <h3>Must include</h3>
      <ul>
        {#each focus.mustInclude as item}
          <li>{item}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if focus.notList.length}
    <section>
      <h3>NOT</h3>
      <ul class="not-list">
        {#each focus.notList as item}
          <li>{item}</li>
        {/each}
      </ul>
    </section>
  {/if}

  {#if focus.wordTarget}
    <section class="meta">
      <span>Target</span>
      <strong>{focus.wordTarget} words</strong>
    </section>
  {/if}

  {#if focus.continuity.length}
    <section>
      <h3>Continuity</h3>
      <ul>
        {#each focus.continuity as hook}
          <li>{hook}</li>
        {/each}
      </ul>
    </section>
  {/if}
</aside>

<style>
  .chapter-panel {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding: 1.25rem;
    background: var(--bg-elevated);
    border-left: 1px solid var(--border);
    overflow-y: auto;
    font-size: 0.9rem;
  }

  header h2 {
    margin: 0.15rem 0 0;
    font-size: 1.1rem;
    font-weight: 600;
  }

  .status {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    margin: 0.35rem 0 0;
    font-size: 0.8rem;
  }

  .status-label {
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .status.missing span:last-child {
    color: var(--text-muted);
    font-style: italic;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.7rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .banner {
    margin: 0;
    padding: 0.65rem 0.75rem;
    background: var(--accent-soft);
    border-left: 3px solid var(--accent);
    font-family: var(--font-prose);
    font-style: italic;
    line-height: 1.4;
  }

  section h3 {
    margin: 0 0 0.35rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    font-weight: 600;
  }

  section p,
  section li {
    margin: 0;
    line-height: 1.45;
  }

  ol,
  ul {
    margin: 0;
    padding-left: 1.1rem;
  }

  .not-list {
    color: var(--text-muted);
  }

  .meta {
    display: flex;
    justify-content: space-between;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
    color: var(--text-muted);
  }
</style>
