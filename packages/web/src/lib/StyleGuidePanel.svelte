<script lang="ts">
  import type { StyleGuideViolation } from "@inscriva/indexer";

  interface Props {
    violations: StyleGuideViolation[];
    styleGuidePath?: string;
    onOpenStyleGuide?: () => void;
    onRunVoiceAssist?: () => void;
    onJump?: (offset: number) => void;
  }

  let {
    violations,
    styleGuidePath,
    onOpenStyleGuide,
    onRunVoiceAssist,
    onJump,
  }: Props = $props();
</script>

<section class="style-guide-panel" aria-label="Style guide checks">
  <header>
    <p class="eyebrow">Style guide</p>
    <h3>Deterministic checks</h3>
    <p class="hint">
      Forbidden phrases and adverbs from
      {#if styleGuidePath && onOpenStyleGuide}
        <button type="button" class="inline-link" onclick={() => onOpenStyleGuide?.()}>
          {styleGuidePath}
        </button>
      {:else}
        <code>00 Canon/Style Guide.md</code>
      {/if}
    </p>
  </header>

  {#if violations.length === 0}
    <p class="clean" role="status">No style guide violations in this draft.</p>
  {:else}
    <p class="count" role="status">{violations.length} issue{violations.length === 1 ? "" : "s"}</p>
    <ul class="violations">
      {#each violations as hit (hit.ruleId + ":" + hit.offset)}
        <li>
          <button
            type="button"
            class="violation-row"
            onclick={() => onJump?.(hit.offset)}
            disabled={!onJump}
          >
            <span class="phrase">{hit.phrase}</span>
            <span class="excerpt">{hit.excerpt}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}

  {#if onRunVoiceAssist}
    <button type="button" class="assist-btn" onclick={() => onRunVoiceAssist?.()}>
      Run voice assist (LLM)
    </button>
  {/if}
</section>

<style>
  .style-guide-panel {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
    font-size: 0.82rem;
  }

  header h3 {
    margin: 0.1rem 0 0;
    font-size: 0.9rem;
    font-weight: 600;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .hint,
  .clean,
  .count {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-muted);
    line-height: 1.35;
  }

  .clean {
    color: #166534;
  }

  .count {
    font-weight: 600;
    color: #92400e;
  }

  .inline-link {
    border: none;
    background: transparent;
    padding: 0;
    font: inherit;
    color: var(--accent);
    text-decoration: underline;
    cursor: pointer;
  }

  .violations {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 12rem;
    overflow: auto;
  }

  .violation-row {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
    padding: 0.35rem 0.45rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  .violation-row:hover:not(:disabled) {
    background: var(--bg-muted);
  }

  .violation-row:disabled {
    cursor: default;
  }

  .phrase {
    font-weight: 600;
    font-size: 0.78rem;
    color: #b45309;
  }

  .excerpt {
    font-size: 0.72rem;
    color: var(--text-muted);
    margin-top: 0.1rem;
  }

  .assist-btn {
    align-self: flex-start;
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    background: transparent;
    color: var(--accent);
    font-size: 0.72rem;
  }
</style>
