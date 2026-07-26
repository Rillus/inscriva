<script lang="ts">
  import type { AlignmentReport, Recommendation } from "@inscriva/indexer";
  import type { LlmTaskId } from "@inscriva/bridge";
  import { isChapterWorkflowComplete } from "@inscriva/indexer";
  import { resolveRecommendationAction } from "./recommendation-guidance.js";

  const workflowComplete = $derived(isChapterWorkflowComplete(outlineStatus));

  interface Props {
    report: AlignmentReport | null;
    outlineStatus?: string;
    recommendations?: Recommendation[];
    busy?: boolean;
    onRefresh?: () => void;
    onDismissRecommendation?: (id: string) => void;
    onRunAssist?: (taskId: LlmTaskId) => void;
  }

  let {
    report,
    outlineStatus,
    recommendations = [],
    busy = false,
    onRefresh,
    onDismissRecommendation,
    onRunAssist,
  }: Props = $props();

  function handleRun(rec: Recommendation) {
    const action = resolveRecommendationAction(rec);
    if (!action) return;
    if (action.kind === "refresh") {
      onRefresh?.();
      return;
    }
    onRunAssist?.(action.taskId);
  }
</script>

<section class="alignment-panel" aria-label="Alignment">
  <header>
    <h2>Alignment</h2>
    <button type="button" class="refresh" disabled={busy} onclick={() => onRefresh?.()}>
      {busy ? "Checking…" : "Refresh checks"}
    </button>
  </header>

  {#if workflowComplete}
    <p class="complete-banner" role="status">
      Outline status: <strong>{outlineStatus}</strong>. Automated checks below are
      advisory — the yellow “run AI review” prompt is hidden for completed chapters.
    </p>
  {/if}

  <p class="intro">
    <strong>Refresh checks</strong> compares your draft to the outline without using AI.
    For interpretation, use <strong>Run AI chapter review</strong> on a recommendation below
    (opens <strong>Assist</strong> in the right column — add an API key in Settings first).
    When a review finishes, it is saved under
    <strong>03 Revision/Alignment/</strong> as <code>ChNN - AI review.md</code>. Workflow status lives in
    the outline <strong>## Status</strong> section (you can sync it from the review when prompted).
  </p>

  {#each recommendations as rec (rec.id)}
    {@const action = resolveRecommendationAction(rec)}
    <div class="rec" role="status">
      <p>{rec.message}</p>
      {#if action}
        <p class="steps">{action.steps}</p>
        <div class="rec-actions">
          <button type="button" class="run" onclick={() => handleRun(rec)}>
            {action.label}
          </button>
          <button
            type="button"
            class="dismiss"
            onclick={() => onDismissRecommendation?.(rec.id)}
          >Dismiss</button>
        </div>
      {:else}
        <button
          type="button"
          class="dismiss"
          onclick={() => onDismissRecommendation?.(rec.id)}
        >Dismiss</button>
      {/if}
    </div>
  {/each}

  {#if !report}
    <p class="hint">Run refresh checks to compare draft against outline goals.</p>
  {:else}
    <dl class="stats">
      <div>
        <dt>Words</dt>
        <dd>{report.wordCount.draftWords} ({report.wordCount.status})</dd>
      </div>
      <div>
        <dt>Scenes</dt>
        <dd>
          {report.scenes.matched.length} matched
          {#if report.scenes.missing.length}
            , {report.scenes.missing.length} missing
          {/if}
        </dd>
      </div>
      <div>
        <dt>Plants</dt>
        <dd>
          {#if report.plants.unlinked.length}
            Unlinked: {report.plants.unlinked.join(", ")}
          {:else}
            All linked
          {/if}
        </dd>
      </div>
    </dl>

    <section>
      <h3>Must include</h3>
      <ul>
        {#each report.mustInclude as m}
          <li class={m.status}>{m.item}</li>
        {/each}
      </ul>
    </section>

    {#if report.mustNot.length}
      <section>
        <h3>Must NOT</h3>
        <ul>
          {#each report.mustNot as m}
            <li class:violated={m.violated}>{m.term}</li>
          {/each}
        </ul>
      </section>
    {/if}
  {/if}
</section>

<style>
  .alignment-panel {
    padding: 0.75rem 1rem;
    font-size: 0.85rem;
    overflow-y: auto;
  }

  .complete-banner {
    margin: 0 0 0.65rem;
    padding: 0.5rem 0.65rem;
    font-size: 0.78rem;
    line-height: 1.45;
    background: var(--accent-soft);
    border-left: 3px solid var(--accent);
    border-radius: 4px;
  }

  .intro {
    margin: 0 0 0.75rem;
    padding: 0.5rem 0.65rem;
    font-size: 0.78rem;
    line-height: 1.45;
    color: var(--text-muted);
    background: var(--bg-elevated);
    border-radius: 6px;
    border: 1px solid var(--border);
  }

  header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  h2 {
    margin: 0;
    font-size: 1rem;
  }

  .refresh {
    font-size: 0.75rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border);
    background: var(--bg-elevated);
    cursor: pointer;
  }

  .rec {
    padding: 0.55rem 0.65rem;
    margin-bottom: 0.5rem;
    background: #f8eacb;
    border-radius: 6px;
    font-size: 0.8rem;
    border: 1px solid var(--ornament-gold-dim, #d4bc8a);
  }

  .rec p {
    margin: 0 0 0.35rem;
  }

  .steps {
    margin: 0 0 0.5rem !important;
    font-size: 0.75rem;
    line-height: 1.4;
    color: #5c3d1e;
  }

  .rec-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
    align-items: center;
  }

  .run {
    font-size: 0.78rem;
    font-weight: 600;
    padding: 0.3rem 0.65rem;
    border-radius: 4px;
    border: 1px solid #8b6914;
    background: linear-gradient(180deg, #faf6ee 0%, #e8dfd4 100%);
    color: #2a1810;
    cursor: pointer;
  }

  .run:hover {
    background: #fff8f0;
  }

  .dismiss {
    font-size: 0.7rem;
    border: none;
    background: transparent;
    text-decoration: underline;
    cursor: pointer;
    color: inherit;
  }

  .stats {
    display: grid;
    gap: 0.35rem;
    margin: 0 0 1rem;
  }

  .stats div {
    display: flex;
    gap: 0.5rem;
  }

  dt {
    font-weight: 600;
    min-width: 4rem;
  }

  dd {
    margin: 0;
  }

  ul {
    margin: 0;
    padding-left: 1.1rem;
  }

  li.hit {
    color: #166534;
  }

  li.miss,
  li.violated {
    color: #b45309;
  }

  .hint {
    color: var(--text-muted);
  }
</style>
