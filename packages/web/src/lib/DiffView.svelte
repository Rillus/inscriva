<script lang="ts">
  import { computeLineDiff } from "./text-diff.js";

  interface Props {
    before: string;
    after: string;
    onaccept: () => void;
    onreject: () => void;
    onacceptall?: () => void;
  }

  let { before, after, onaccept, onreject, onacceptall }: Props = $props();

  const lines = $derived(computeLineDiff(before, after));
  let copyLabel = $state("Copy to clipboard");

  async function copyAfter() {
    try {
      await navigator.clipboard.writeText(after);
      copyLabel = "Copied";
      setTimeout(() => {
        copyLabel = "Copy to clipboard";
      }, 1500);
    } catch {
      copyLabel = "Failed";
    }
  }
</script>

<section class="diff-view" aria-label="Suggested changes">
  <div class="diff-body" role="region" aria-label="Diff preview">
    {#each lines as line}
      <div class="diff-line {line.type}" data-type={line.type}>
        <span class="marker" aria-hidden="true">
          {#if line.type === "add"}+{:else if line.type === "remove"}−{:else}&nbsp;{/if}
        </span>
        <span class="text">{line.text || " "}</span>
      </div>
    {:else}
      <p class="empty">No changes</p>
    {/each}
  </div>

  <div class="diff-actions">
    <button type="button" class="primary" onclick={onaccept}>Accept</button>
    <button type="button" onclick={onreject}>Reject</button>
    {#if onacceptall}
      <button type="button" onclick={onacceptall}>Accept all</button>
    {/if}
    <button type="button" onclick={copyAfter}>{copyLabel}</button>
  </div>
</section>

<style>
  .diff-view {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-height: 0;
  }

  .diff-body {
    margin: 0;
    padding: 0.5rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--bg-muted);
    font-family: var(--font-prose);
    font-size: 0.78rem;
    line-height: 1.45;
    max-height: 16rem;
    overflow: auto;
  }

  .diff-line {
    display: flex;
    gap: 0.35rem;
    padding: 0.1rem 0.25rem;
    border-radius: 3px;
    white-space: pre-wrap;
    word-break: break-word;
  }

  .marker {
    flex: 0 0 0.85rem;
    font-family: var(--font-ui);
    font-weight: 600;
    color: var(--text-muted);
    user-select: none;
  }

  .diff-line.same {
    color: var(--text);
  }

  .diff-line.add {
    background: color-mix(in srgb, var(--accent-soft) 70%, transparent);
    color: var(--text);
  }

  .diff-line.add .marker {
    color: var(--accent);
  }

  .diff-line.remove {
    background: color-mix(in srgb, var(--border) 40%, transparent);
    color: var(--text-muted);
    text-decoration: line-through;
  }

  .diff-line.remove .marker {
    color: #b45309;
  }

  .empty {
    margin: 0;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .diff-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .diff-actions button {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.35rem 0.65rem;
    background: var(--bg-muted);
    font-size: 0.78rem;
  }

  .primary {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }
</style>
