<script lang="ts">
  import type { InscrivaBridge, LlmRequest, LlmTaskId } from "@inscriva/bridge";
  import type { AssembledContext } from "@inscriva/llm";
  import type { LlmProviderId } from "@inscriva/llm";
  import DiffView from "./DiffView.svelte";
  import { fetchLlmPreview } from "./llm-preview.js";
  import {
    interpretLlmError,
    tryInterpretStreamedLlmError,
    type InterpretedLlmError,
  } from "./interpret-llm-error.js";
  import {
    LLM_PROVIDERS,
    loadPreferredProvider,
    modelForProvider,
    savePreferredProvider,
  } from "./llm-settings.js";

  interface Props {
    bridge: InscrivaBridge;
    bookId: string;
    chapterKey?: string;
    taskId?: LlmTaskId;
    activePath?: string;
    selectionText?: string;
    draftExcerpt?: string;
    chapterFocus?: string;
    relevantCanon?: string;
    onclose: () => void;
    onapply?: (text: string) => void;
  }

  let {
    bridge,
    bookId,
    chapterKey,
    taskId: taskIdProp,
    selectionText,
    draftExcerpt,
    chapterFocus,
    relevantCanon,
    onclose,
    onapply,
  }: Props = $props();

  const TASKS: { id: LlmTaskId; label: string }[] = [
    { id: "draft-scene", label: "Draft scene" },
    { id: "fix-paragraph", label: "Fix paragraph" },
    { id: "review-structure", label: "Review structure" },
    { id: "review-voice", label: "Review voice" },
    { id: "review-continuity", label: "Review continuity" },
    { id: "explain-canon", label: "Explain canon" },
  ];

  const DIFF_TASKS = new Set<LlmTaskId>(["draft-scene", "fix-paragraph"]);

  let taskId = $state<LlmTaskId>("draft-scene");

  $effect(() => {
    if (taskIdProp) taskId = taskIdProp;
  });
  let provider = $state<LlmProviderId>(loadPreferredProvider() ?? "openai");

  $effect(() => {
    savePreferredProvider(provider);
  });
  let instruction = $state("");
  let output = $state("");
  let beforeText = $state("");
  let contextPreview = $state<AssembledContext | null>(null);
  let showContext = $state(false);
  let running = $state(false);
  let error = $state<InterpretedLlmError | null>(null);
  let errorEl = $state<HTMLDivElement | null>(null);

  $effect(() => {
    if (!error || !errorEl) return;
    errorEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  const usesDiff = $derived(DIFF_TASKS.has(taskId));
  const showDiff = $derived(!running && Boolean(output) && usesDiff);

  function buildRequest(): LlmRequest {
    return {
      taskId,
      provider,
      model: modelForProvider(provider),
      bookId,
      chapterKey,
      selectionText: selectionText?.trim() || undefined,
      draftExcerpt: draftExcerpt?.trim() || undefined,
      chapterFocus: chapterFocus?.trim() || undefined,
      relevantCanon: relevantCanon?.trim() || undefined,
      userMessage: instruction.trim() || undefined,
    };
  }

  const needsSelection = $derived(taskId === "fix-paragraph");
  const missingSelection = $derived(needsSelection && !selectionText?.trim());

  async function runAssist() {
    beforeText = selectionText?.trim() ?? "";
    running = true;
    error = null;
    output = "";
    try {
      for await (const chunk of bridge.llmStream(buildRequest())) {
        output += chunk;
      }
      const streamed = tryInterpretStreamedLlmError(output);
      if (streamed) {
        error = streamed;
        output = "";
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      error = interpretLlmError(message);
    } finally {
      running = false;
    }
  }

  async function viewContext() {
    showContext = true;
    contextPreview = await fetchLlmPreview(buildRequest());
    if (!contextPreview) {
      error = {
        title: "Context preview unavailable",
        summary: "Context preview needs the dev bridge with an open book.",
      };
    }
  }

  function clearOutput() {
    output = "";
    beforeText = "";
  }

  function acceptSuggestion() {
    onapply?.(output);
    clearOutput();
  }
</script>

<aside class="assist" class:has-error={Boolean(error)} aria-label="Assist">
  <header>
    <h2>Assist</h2>
    <button type="button" class="close" onclick={onclose} aria-label="Close assist">×</button>
  </header>

  {#if error}
    <div
      bind:this={errorEl}
      class="llm-error-panel llm-error-panel--rail"
      role="alert"
    >
      <h4 class="llm-error-title">{error.title}</h4>
      <p class="llm-error-summary">{error.summary}</p>
      {#if error.hint}
        <p class="llm-error-hint">{error.hint}</p>
      {/if}
      {#if error.detail}
        <details class="llm-error-details">
          <summary>Technical details</summary>
          <pre>{error.detail}</pre>
        </details>
      {/if}
    </div>
  {/if}

  <label>
    Task
    <select bind:value={taskId}>
      {#each TASKS as task}
        <option value={task.id}>{task.label}</option>
      {/each}
    </select>
  </label>

  <label>
    Provider
    <select bind:value={provider}>
      {#each LLM_PROVIDERS as id}
        <option value={id}>{id}</option>
      {/each}
    </select>
  </label>

  <label>
    Instruction
    <textarea
      rows="3"
      placeholder="Optional guidance for this run…"
      bind:value={instruction}
    ></textarea>
  </label>

  <div class="actions">
    <button
      type="button"
      class="primary"
      disabled={running || missingSelection}
      onclick={runAssist}
    >
      {running ? "Running…" : "Run"}
    </button>
    <button type="button" disabled={running} onclick={viewContext}>View context</button>
  </div>

  {#if missingSelection}
    <p class="hint">Select text in the editor to fix a paragraph.</p>
  {/if}

  {#if showContext && contextPreview}
    <details open class="context">
      <summary>
        Context (~{contextPreview.estimatedTokens} tokens)
      </summary>
      <pre>{contextPreview.system}

---

{contextPreview.user}</pre>
    </details>
  {/if}

  {#if output}
    <section class="output">
      <h3>{showDiff ? "Suggested changes" : "Response"}</h3>
      {#if showDiff}
        <DiffView
          before={beforeText}
          after={output}
          onaccept={acceptSuggestion}
          onreject={clearOutput}
        />
      {:else if running && usesDiff}
        <pre class="streaming">{output}</pre>
      {:else}
        <pre>{output}</pre>
      {/if}
    </section>
  {/if}
</aside>

<style>
  .assist {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    min-height: 0;
    border-top: 1px solid var(--border);
    padding: 0.75rem;
    background: var(--bg-elevated);
    overflow: auto;
  }

  header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  h2 {
    margin: 0;
    font-size: 0.95rem;
  }

  h3 {
    margin: 0 0 0.35rem;
    font-size: 0.85rem;
    color: var(--text-muted);
  }

  .close {
    border: none;
    background: transparent;
    font-size: 1.2rem;
    color: var(--text-muted);
  }

  label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  select,
  textarea {
    font: inherit;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.4rem 0.5rem;
    background: var(--surface-input);
    color: var(--text);
  }

  .actions {
    display: flex;
    gap: 0.5rem;
  }

  .actions button {
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.35rem 0.65rem;
    background: var(--bg-muted);
    font-size: 0.8rem;
  }

  .primary {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  .hint {
    margin: 0;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .context pre,
  .output pre {
    margin: 0;
    padding: 0.5rem;
    border-radius: 6px;
    background: var(--bg-muted);
    font-size: 0.72rem;
    line-height: 1.4;
    white-space: pre-wrap;
    max-height: 12rem;
    overflow: auto;
  }

  .output {
    flex: 1;
    min-height: 0;
  }

  .output pre {
    max-height: 16rem;
  }

  .streaming {
    opacity: 0.85;
  }
</style>
