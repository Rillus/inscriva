<script lang="ts">
  import type { InscrivaBridge } from "@inscriva/bridge";
  import type { AssembledContext } from "@inscriva/llm";
  import {
    notesForEditorAnchor,
    type CanonIndex,
    type LineNote,
    type NoteType,
  } from "@inscriva/indexer";
  import type { EditorSelection } from "./editor-selection.js";
  import { fetchLlmPreview } from "./llm-preview.js";
  import {
    loadResponseLengthId,
    maxOutputTokensForLength,
    RESPONSE_LENGTH_PRESETS,
    saveResponseLengthId,
    type ResponseLengthId,
  } from "./llm-response-length.js";
  import type { PendingSuggestionRange } from "./pending-suggestion.js";
  import {
    modelForProvider,
    pickLlmProvider,
  } from "./llm-settings.js";
  import {
    defaultIntentForSelection,
    detectWriteWithAiAnchor,
    type WriteWithAiIntent,
    writeWithAiSnapshotMatchesCaret,
  } from "./write-with-ai-context.js";
  import type { InterpretedLlmError } from "./interpret-llm-error.js";
  import type { WriteWithAiGenerate } from "./write-with-ai.js";
  import { buildWriteWithAiLlmRequest } from "./write-with-ai-request.js";
  import {
    applyWriteWithAiToContent,
    pendingRangeAfterApply,
    resolveGenerateKind,
    runWriteWithAi,
  } from "./write-with-ai-runner.js";
  import { assembleWritingContext } from "./writing-context.js";
  import {
    buildLineNote,
    noteTargetFromAnchor,
    paragraphAnchorIdForOffset,
  } from "./note-target.js";

  type PanelMode = "generate" | "note";

  const NOTE_TYPES: { value: NoteType; label: string }[] = [
    { value: "comment", label: "Comment" },
    { value: "continuity", label: "Continuity" },
    { value: "voice", label: "Voice" },
    { value: "plant", label: "Plant" },
    { value: "todo", label: "To-do" },
  ];

  interface Props {
    bridge?: InscrivaBridge | null;
    bookId?: string | null;
    activePath?: string;
    chapterKey?: string;
    notes?: LineNote[];
    outlineContent?: string;
    canonIndex?: CanonIndex | null;
    editorContent: string;
    selection: EditorSelection | null;
    caretFrom: number;
    caretTo: number;
    mode?: "draft" | "revise" | "read";
    generate?: WriteWithAiGenerate | null;
    onapply?: (
      content: string,
      pending: PendingSuggestionRange,
    ) => void;
    onaddnote?: (note: LineNote) => void;
  }

  let {
    bridge = null,
    bookId = null,
    activePath,
    chapterKey,
    notes = [],
    outlineContent = "",
    canonIndex = null,
    editorContent,
    selection,
    caretFrom,
    caretTo,
    mode = "draft",
    generate = null,
    onapply,
    onaddnote,
  }: Props = $props();

  const anchor = $derived(
    detectWriteWithAiAnchor(editorContent, caretFrom, caretTo),
  );

  const anchorKey = $derived(
    anchor ? `${anchor.kind}:${anchor.from}:${anchor.to}` : "",
  );

  const writingContext = $derived(
    anchor
      ? assembleWritingContext({
          editorContent,
          outlineContent,
          canonIndex,
          offset: anchor.to,
          workingText: anchor.text,
        })
      : null,
  );

  let panelMode = $state<PanelMode>("generate");
  let intent = $state<WriteWithAiIntent>("expand");
  let instruction = $state("");
  let noteText = $state("");
  let noteType = $state<NoteType>("comment");
  let responseLengthId = $state<ResponseLengthId>(loadResponseLengthId());

  const noteTarget = $derived(
    anchor && activePath
      ? noteTargetFromAnchor(editorContent, activePath, anchor)
      : null,
  );

  const paragraphAnchorId = $derived(
    anchor && activePath
      ? paragraphAnchorIdForOffset(activePath, editorContent, anchor.from)
      : undefined,
  );

  const relevantNotes = $derived(
    noteTarget
      ? notesForEditorAnchor(notes, {
          file: noteTarget.file,
          from: noteTarget.from,
          to: noteTarget.to,
          anchorId: paragraphAnchorId,
        })
      : [],
  );

  const maxOutputTokens = $derived(
    maxOutputTokensForLength(responseLengthId),
  );

  const previewKey = $derived(
    anchor
      ? `${anchorKey}:${intent}:${instruction.trim()}:${responseLengthId}`
      : "",
  );

  const inputTokens = $derived(contextPreview?.estimatedTokens ?? null);

  const totalTokens = $derived(
    inputTokens !== null ? inputTokens + maxOutputTokens : null,
  );
  let running = $state(false);
  let error = $state<InterpretedLlmError | null>(null);
  let errorEl = $state<HTMLDivElement | null>(null);
  let advancedOpen = $state(false);
  let contextPreview = $state<AssembledContext | null>(null);
  let contextPreviewLoading = $state(false);
  let contextPreviewError = $state<string | null>(null);

  $effect(() => {
    anchorKey;
    if (anchor?.kind === "selection") {
      intent = defaultIntentForSelection(anchor.text);
    }
    instruction = "";
    noteText = "";
    error = null;
    contextPreview = null;
    contextPreviewError = null;
  });

  $effect(() => {
    if (!error || !errorEl) return;
    errorEl.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });

  $effect(() => {
    if (!advancedOpen || !bridge || !bookId || !anchor || !writingContext) {
      return;
    }
    previewKey;
    void loadContextPreview();
  });

  const hasSelection = $derived(Boolean(selection?.text));
  const excerpt = $derived(
    selection?.text ??
      (anchor?.kind === "continue" ? anchor.text : null),
  );

  async function loadContextPreview() {
    if (!bridge || !bookId || !anchor || !writingContext) return;

    contextPreviewLoading = true;
    contextPreviewError = null;

    try {
      const providers = await bridge.listProviders();
      const provider = pickLlmProvider(providers);
      if (!provider) {
        contextPreview = null;
        contextPreviewError = "No API key configured for any provider.";
        return;
      }

      const kind = resolveGenerateKind(anchor.kind, intent);
      const request = buildWriteWithAiLlmRequest({
        bookId,
        chapterKey,
        provider,
        model: modelForProvider(provider),
        kind,
        text: anchor.text,
        prompt: instruction.trim(),
        writing: writingContext,
        maxOutputTokens,
      });

      contextPreview = await fetchLlmPreview(request);
      if (!contextPreview) {
        contextPreviewError =
          "Could not load context preview. Is the dev bridge running with this book open?";
      }
    } finally {
      contextPreviewLoading = false;
    }
  }

  async function runGenerate() {
    if (!generate || !anchor || !onapply) return;
    if (anchor.kind === "continue" && !instruction.trim()) return;
    if (anchor.kind === "selection" && intent === "rewrite" && !instruction.trim()) {
      return;
    }

    const applyOnapply = onapply;
    const snapshotFrom = anchor.from;
    const snapshotTo = anchor.to;
    const snapshotKind = anchor.kind;
    const snapshotText = anchor.text;

    running = true;
    error = null;

    const kind = resolveGenerateKind(snapshotKind, intent);
    const result = await runWriteWithAi(generate, {
      kind,
      from: snapshotFrom,
      to: snapshotTo,
      text: snapshotText,
      prompt: instruction.trim(),
      maxOutputTokens,
    });

    running = false;

    if (!result.ok) {
      error = result.error;
      return;
    }

    if (!applyOnapply) return;

    if (
      !writeWithAiSnapshotMatchesCaret(
        editorContent,
        caretFrom,
        caretTo,
        {
          from: snapshotFrom,
          to: snapshotTo,
          kind: snapshotKind,
        },
      )
    ) {
      error = {
        title: "Cursor or selection changed",
        summary:
          "The document, cursor, or selection changed while writing. The result was not applied.",
        hint: "Try again once the cursor or selection matches where you started.",
      };
      return;
    }

    const nextContent = applyWriteWithAiToContent(
      editorContent,
      snapshotFrom,
      snapshotTo,
      result.text,
      kind,
    );
    const pending = pendingRangeAfterApply(
      editorContent,
      snapshotFrom,
      snapshotTo,
      result.text,
      kind,
    );
    applyOnapply(nextContent, pending);
    instruction = "";
    error = null;
  }

  function submitNote() {
    if (!onaddnote || !anchor || !noteTarget || !noteText.trim()) return;
    onaddnote(
      buildLineNote({
        text: noteText,
        type: noteType,
        target: noteTarget,
        paragraphAnchorId,
      }),
    );
    noteText = "";
  }
</script>

<aside class="actions-panel" class:has-error={Boolean(error)} aria-label="Actions">
  <header>
    <h2>Actions</h2>
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

  {#if mode === "read"}
    <p class="hint">Switch to Draft or Revise mode to use actions.</p>
  {:else if !anchor}
    <p class="hint">
      Select text, or place the cursor at the end of a sentence, to see actions.
    </p>
  {:else}
  <div class="mode-tabs" role="tablist" aria-label="Action type">
    <button
      type="button"
      role="tab"
      class:active={panelMode === "generate"}
      aria-selected={panelMode === "generate"}
      onclick={() => (panelMode = "generate")}
    >
      Generate content
    </button>
    <button
      type="button"
      role="tab"
      class:active={panelMode === "note"}
      aria-selected={panelMode === "note"}
      onclick={() => (panelMode = "note")}
    >
      Add note
    </button>
  </div>

  <section class="context">
    {#if hasSelection}
      <p class="label">Selection</p>
      <blockquote class="excerpt">{excerpt}</blockquote>
    {:else if anchor.kind === "continue"}
      <p class="label">Sentence</p>
      <blockquote class="excerpt">{excerpt}</blockquote>
    {/if}
  </section>

  {#if panelMode === "generate"}
  {#if !generate}
    <p class="hint">Open a book and add an API key in Settings to generate content.</p>
  {:else}
  {#if anchor.kind === "selection"}
    <fieldset class="intent">
      <legend>How to use the selection</legend>
      <label class="intent-option">
        <input type="radio" name="ai-intent" value="prompt" bind:group={intent} />
        Use as prompt
      </label>
      <label class="intent-option">
        <input type="radio" name="ai-intent" value="expand" bind:group={intent} />
        Expand selection
      </label>
      <label class="intent-option">
        <input type="radio" name="ai-intent" value="rewrite" bind:group={intent} />
        Rewrite with changes
      </label>
    </fieldset>
  {/if}

  <label class="response-length">
    Expected response length
    <select
      bind:value={responseLengthId}
      onchange={() => saveResponseLengthId(responseLengthId)}
      disabled={running}
    >
      {#each RESPONSE_LENGTH_PRESETS as preset}
        <option value={preset.id}>{preset.label}</option>
      {/each}
    </select>
  </label>

  <label class="instruction">
    {anchor.kind === "selection" && intent === "prompt"
      ? "Optional: add detail to your prompt"
      : anchor.kind === "selection" && intent === "rewrite"
        ? "What should change?"
        : anchor.kind === "selection"
          ? "Optional: how should this be expanded?"
          : "What should happen next?"}
    <textarea
      rows="2"
      bind:value={instruction}
      placeholder={anchor.kind === "continue"
        ? "Describe what to write next…"
        : intent === "rewrite"
          ? "e.g. She reacts with surprise instead of anger…"
          : "Optional guidance…"}
      disabled={running}
    ></textarea>
  </label>

  <button
    type="button"
    class="primary"
    disabled={running ||
      (anchor.kind === "continue" && !instruction.trim()) ||
      (anchor.kind === "selection" && intent === "rewrite" && !instruction.trim())}
    onclick={runGenerate}
  >
    {running ? "Writing…" : "Generate"}
  </button>

  <details class="advanced" bind:open={advancedOpen}>
    <summary>Advanced</summary>

    {#if contextPreviewLoading}
      <p class="hint">Loading context…</p>
    {:else if contextPreviewError}
      <p class="hint context-error">{contextPreviewError}</p>
    {:else if contextPreview}
      <p class="token-budget">
        {#if inputTokens !== null}
          ~{inputTokens.toLocaleString()} input tokens · up to ~{maxOutputTokens.toLocaleString()}
          output · ~{totalTokens?.toLocaleString()} total
        {:else}
          ~{contextPreview.estimatedTokens.toLocaleString()} tokens in prompt
        {/if}
      </p>
      <p class="context-meta">Task: draft-scene</p>
      <ul class="context-sections" aria-label="Context sections sent to the model">
        {#each contextPreview.sections as section}
          <li class:excluded={!section.included}>
            <span class="section-label">{section.label}</span>
            {#if section.path}
              <span class="section-path">{section.path}</span>
            {/if}
            <span class="section-chars">
              {section.chars.toLocaleString()} chars
              {#if !section.included}(trimmed){/if}
            </span>
          </li>
        {/each}
      </ul>
      <details class="context-prompt">
        <summary>Full prompt</summary>
        <pre>{contextPreview.system}

---

{contextPreview.user}</pre>
      </details>
    {:else if writingContext}
      <p class="hint">Open this section to load the full context preview.</p>
      <ul class="context-sections local" aria-label="Local context assembled in the app">
        {#if writingContext.chapterFocus}
          <li>
            <span class="section-label">Chapter focus</span>
          </li>
        {/if}
        {#if writingContext.draftExcerpt}
          <li>
            <span class="section-label">Draft excerpt</span>
          </li>
        {/if}
        {#if writingContext.relevantCanon}
          <li>
            <span class="section-label">Relevant canon</span>
          </li>
        {/if}
        {#if !writingContext.chapterFocus && !writingContext.draftExcerpt && !writingContext.relevantCanon}
          <li class="excluded">
            <span class="section-label">No extra context detected</span>
          </li>
        {/if}
      </ul>
    {/if}
  </details>
  {/if}
  {:else}
  {#if !bridge || !activePath}
    <p class="hint">Open a book to save notes.</p>
  {:else}
  <label class="note-type">
    Note type
    <select bind:value={noteType} disabled={!onaddnote}>
      {#each NOTE_TYPES as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </label>

  <label class="note-body">
    Note
    <textarea
      rows="3"
      bind:value={noteText}
      placeholder="Comment on this passage…"
      disabled={!onaddnote}
    ></textarea>
  </label>

  <button
    type="button"
    class="primary"
    disabled={!onaddnote || !noteText.trim()}
    onclick={submitNote}
  >
    Add note
  </button>

  {#if relevantNotes.length}
    <section class="attached-notes" aria-label="Notes on this passage">
      <p class="label">Notes here ({relevantNotes.length})</p>
      <ul>
        {#each relevantNotes as note}
          <li>
            <span class="note-kind">{note.type}</span>
            <span class="note-text">{note.text}</span>
            {#if note.target?.excerpt && note.target.excerpt !== excerpt}
              <span class="note-excerpt">on “{note.target.excerpt}”</span>
            {/if}
          </li>
        {/each}
      </ul>
    </section>
  {/if}
  {/if}
  {/if}
  {/if}
</aside>

<style>
  .actions-panel {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    max-height: min(42vh, 22rem);
    overflow: auto;
    padding: 0.75rem;
    border-top: 1px solid var(--border);
    background: var(--bg-elevated);
    font-family: var(--font-ui);
  }

  .actions-panel.has-error {
    max-height: min(58vh, 34rem);
  }

  .actions-panel:has(.advanced[open]) {
    max-height: min(62vh, 38rem);
  }

  header h2 {
    margin: 0;
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--text);
  }

  .mode-tabs {
    display: flex;
    gap: 0.35rem;
    padding: 0.2rem;
    border-radius: 8px;
    background: var(--bg-muted);
    border: 1px solid var(--border);
  }

  .mode-tabs button {
    flex: 1;
    border: none;
    border-radius: 6px;
    padding: 0.35rem 0.45rem;
    font: inherit;
    font-size: 0.72rem;
    font-weight: 500;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
  }

  .mode-tabs button.active {
    background: var(--bg-elevated);
    color: var(--text);
    box-shadow: 0 1px 3px rgba(42, 24, 16, 0.1);
  }

  .note-type,
  .note-body {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .note-type select,
  .note-body textarea {
    font: inherit;
    font-size: 0.85rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.4rem 0.5rem;
    background: var(--surface-input);
    color: var(--text);
  }

  .attached-notes .label {
    margin: 0 0 0.35rem;
    font-size: 0.72rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .attached-notes ul {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    max-height: 8rem;
    overflow: auto;
  }

  .attached-notes li {
    padding: 0.4rem 0.5rem;
    border-radius: 6px;
    background: var(--surface-input);
    border: 1px solid var(--border);
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .note-kind {
    display: block;
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--accent);
    margin-bottom: 0.15rem;
  }

  .note-text {
    color: var(--text);
  }

  .note-excerpt {
    display: block;
    margin-top: 0.2rem;
    font-size: 0.68rem;
    color: var(--text-muted);
    font-style: italic;
  }

  .hint {
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.4;
    color: var(--text-muted);
  }

  .context-error {
    color: #9a3412;
  }

  .context .label {
    margin: 0 0 0.35rem;
    font-size: 0.72rem;
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
  }

  .excerpt {
    margin: 0;
    padding: 0.5rem 0.6rem;
    max-height: 6rem;
    overflow: auto;
    border-left: 3px solid var(--accent);
    border-radius: 0 6px 6px 0;
    background: color-mix(in srgb, var(--accent) 6%, var(--surface-input));
    font-family: var(--font-prose);
    font-size: 0.82rem;
    line-height: 1.45;
    color: var(--text);
    white-space: pre-wrap;
    word-break: break-word;
  }

  .intent {
    margin: 0;
    padding: 0;
    border: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .intent legend {
    font-size: 0.72rem;
    font-weight: 500;
    color: var(--text-muted);
    margin-bottom: 0.15rem;
  }

  .intent-option {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-size: 0.8rem;
    cursor: pointer;
  }

  .response-length,
  .instruction {
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
    font-size: 0.75rem;
    color: var(--text-muted);
  }

  .response-length select {
    font: inherit;
    font-size: 0.85rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.35rem 0.5rem;
    background: var(--surface-input);
    color: var(--text);
  }

  .token-budget {
    margin: 0 0 0.4rem;
    padding: 0.45rem 0.55rem;
    border-radius: 6px;
    background: color-mix(in srgb, var(--accent) 8%, var(--surface-input));
    border: 1px solid color-mix(in srgb, var(--accent) 25%, var(--border));
    font-size: 0.75rem;
    line-height: 1.4;
    color: var(--text);
  }

  .instruction textarea {
    font: inherit;
    font-size: 0.85rem;
    border: 1px solid var(--border);
    border-radius: 6px;
    padding: 0.4rem 0.5rem;
    background: var(--surface-input);
    color: var(--text);
    resize: vertical;
    min-height: 2.5rem;
  }

  .primary {
    align-self: flex-start;
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.38rem 0.75rem;
    border-radius: 6px;
    border: 1px solid var(--accent);
    background: var(--accent);
    color: #fff;
    cursor: pointer;
  }

  .primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .advanced {
    margin: 0;
    font-size: 0.78rem;
    color: var(--text-muted);
  }

  .advanced > summary {
    cursor: pointer;
    font-weight: 500;
    color: var(--text);
    user-select: none;
  }

  .advanced[open] > summary {
    margin-bottom: 0.45rem;
  }

  .context-meta {
    margin: 0 0 0.4rem;
    font-size: 0.72rem;
    color: var(--text-muted);
  }

  .context-sections {
    margin: 0 0 0.5rem;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  .context-sections li {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.25rem 0.45rem;
    padding: 0.35rem 0.45rem;
    border-radius: 6px;
    background: var(--surface-input);
    border: 1px solid var(--border);
    font-size: 0.75rem;
  }

  .context-sections li.excluded {
    opacity: 0.65;
    border-style: dashed;
  }

  .section-label {
    font-weight: 500;
    color: var(--text);
  }

  .section-path {
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .section-chars {
    margin-left: auto;
    font-size: 0.68rem;
    color: var(--text-muted);
  }

  .context-prompt {
    margin: 0;
    font-size: 0.75rem;
  }

  .context-prompt > summary {
    cursor: pointer;
    color: var(--text-muted);
    user-select: none;
  }

  .context-prompt pre {
    margin: 0.4rem 0 0;
    padding: 0.5rem;
    border-radius: 6px;
    background: var(--bg-muted);
    font-size: 0.68rem;
    line-height: 1.4;
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 10rem;
    overflow: auto;
  }
</style>
