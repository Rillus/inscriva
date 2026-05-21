<script lang="ts">
  import type { LlmTaskId } from "@inscriva/bridge";
  import { REVISION_PASSES, type RevisionPassId } from "@inscriva/indexer";

  interface Props {
    /** Plant ids from outline continuity not yet mentioned in the draft. */
    unlinkedPlants?: string[];
    checked?: Partial<Record<RevisionPassId, boolean>>;
    currentPassId?: RevisionPassId;
    onCheckedChange?: (passId: RevisionPassId, checked: boolean) => void;
    onSelectPass?: (passId: RevisionPassId) => void;
    onRunAssist?: (taskId: LlmTaskId) => void;
  }

  let {
    unlinkedPlants = [],
    checked = {},
    currentPassId = "structure",
    onCheckedChange,
    onSelectPass,
    onRunAssist,
  }: Props = $props();

  const activePass = $derived(
    REVISION_PASSES.find((p) => p.id === currentPassId) ?? REVISION_PASSES[0]!,
  );
</script>

<aside class="revision-panel" aria-label="Revision passes">
  <header>
    <p class="eyebrow">Revision</p>
    <h2>Passes</h2>
  </header>

  {#if unlinkedPlants.length}
    <div class="plant-warn" role="status">
      <strong>Plants not in draft</strong>
      <p>
        These continuity plants are in the outline but not referenced in the draft yet
        (soft warning — no auto-rewrite):
      </p>
      <ul>
        {#each unlinkedPlants as plantId}
          <li><code>{plantId}</code></li>
        {/each}
      </ul>
    </div>
  {/if}

  <ol class="pass-list">
    {#each REVISION_PASSES as pass (pass.id)}
      <li class:current={pass.id === currentPassId} class:done={checked[pass.id]}>
        <label class="pass-row">
          <input
            type="checkbox"
            checked={Boolean(checked[pass.id])}
            onchange={(e) =>
              onCheckedChange?.(pass.id, (e.currentTarget as HTMLInputElement).checked)}
          />
          <button
            type="button"
            class="pass-label"
            onclick={() => onSelectPass?.(pass.id)}
          >
            <span class="name">{pass.label}</span>
            <span class="hint">{pass.description}</span>
          </button>
        </label>
        {#if pass.id === currentPassId && pass.suggestedTaskId}
          <button
            type="button"
            class="assist-btn"
            onclick={() => onRunAssist?.(pass.suggestedTaskId!)}
          >
            Run {pass.label.toLowerCase()} assist
          </button>
        {/if}
      </li>
    {/each}
  </ol>

  {#if activePass.id === "read-aloud"}
    <p class="read-aloud-note">
      Read the chapter aloud yourself — Inscriva will not rewrite prose for this pass.
    </p>
  {/if}
</aside>

<style>
  .revision-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0.85rem 1rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
    font-size: 0.85rem;
  }

  header h2 {
    margin: 0.1rem 0 0;
    font-size: 0.95rem;
    font-weight: 600;
  }

  .eyebrow {
    margin: 0;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--text-muted);
  }

  .plant-warn {
    padding: 0.55rem 0.65rem;
    border-radius: 6px;
    background: #fef3c7;
    border: 1px solid #f59e0b;
    color: #92400e;
    font-size: 0.78rem;
  }

  .plant-warn strong {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .plant-warn p {
    margin: 0 0 0.35rem;
    line-height: 1.35;
  }

  .plant-warn ul {
    margin: 0;
    padding-left: 1rem;
  }

  .plant-warn code {
    font-size: 0.8rem;
    font-weight: 600;
  }

  .pass-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .pass-list li {
    border-radius: 6px;
    padding: 0.25rem 0.35rem;
  }

  .pass-list li.current {
    background: var(--bg-muted);
  }

  .pass-list li.done .name {
    text-decoration: line-through;
    color: var(--text-muted);
  }

  .pass-row {
    display: flex;
    align-items: flex-start;
    gap: 0.45rem;
    cursor: pointer;
  }

  .pass-row input {
    margin-top: 0.2rem;
  }

  .pass-label {
    flex: 1;
    border: none;
    background: transparent;
    padding: 0;
    text-align: left;
    color: inherit;
    cursor: pointer;
  }

  .name {
    display: block;
    font-weight: 600;
    font-size: 0.82rem;
  }

  .hint {
    display: block;
    font-size: 0.72rem;
    color: var(--text-muted);
    line-height: 1.3;
    margin-top: 0.1rem;
  }

  .assist-btn {
    margin: 0.25rem 0 0 1.35rem;
    border: 1px solid var(--accent);
    border-radius: 6px;
    padding: 0.25rem 0.5rem;
    background: transparent;
    color: var(--accent);
    font-size: 0.72rem;
  }

  .read-aloud-note {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-muted);
    font-style: italic;
    line-height: 1.35;
  }
</style>
