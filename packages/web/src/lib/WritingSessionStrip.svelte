<script lang="ts">
  import { formatSessionClock } from "./writing-session-tracker.js";

  interface Props {
    activeSeconds: number;
    paused?: boolean;
    wordsAdded: number;
    draftWords: number;
    targetLabel?: string;
  }

  let {
    activeSeconds,
    paused = false,
    wordsAdded,
    draftWords,
    targetLabel,
  }: Props = $props();
</script>

<div class="session-strip" role="status" aria-label="Writing session">
  <span class="clock" title="Active writing time">{formatSessionClock(activeSeconds, paused)}</span>
  <span class="sep">·</span>
  <span class="words" title="Words added this session">+{wordsAdded} words</span>
  <span class="sep">·</span>
  <span class="total" title="Draft word count">{draftWords} total</span>
  {#if targetLabel}
    <span class="sep">·</span>
    <span class="target" title="Outline word target">target {targetLabel}</span>
  {/if}
</div>

<style>
  .session-strip {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.25rem;
    padding: 0.35rem 1rem;
    font-size: 0.78rem;
    color: var(--text-muted, #6b5a48);
    border-bottom: 1px solid var(--border, #e0d6c8);
    background: var(--bg-elevated, #faf6ee);
  }

  .sep {
    color: var(--text-muted);
  }

  .clock {
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }
</style>
