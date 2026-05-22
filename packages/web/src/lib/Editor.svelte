<script lang="ts">
  import { untrack } from "svelte";
  import {
    Compartment,
    EditorSelection as CMSelection,
    EditorState,
  } from "@codemirror/state";
  import { EditorView, keymap, lineNumbers } from "@codemirror/view";
  import {
    defaultKeymap,
    history,
    historyKeymap,
    selectAll,
  } from "@codemirror/commands";
  import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
  import {
    markdownLivePreview,
    refreshMarkdownPreview,
  } from "./markdown-live-preview.js";
  import {
    markdownTableVisual,
    tableVisualModeFacet,
  } from "./markdown-table-visual.js";
  import {
    copyToClipboard,
    cutToClipboard,
    pasteFromClipboard,
    toggleBold,
    toggleItalic,
  } from "./markdown-formatting.js";
  import type { CanonIndex } from "@inscriva/indexer";
  import {
    canonHoverExtension,
    wikilinkAutocomplete,
  } from "./codemirror-extensions.js";
  import { shouldReplaceEditorDocument } from "./editor-sync.js";
  import { shouldNotifyPresentationLifecycle } from "./editor-presentation.js";
  import {
    readEditorSelection,
    type EditorSelection,
    type EditorSelectionChange,
  } from "./editor-selection.js";
  import type { FileViewState } from "./editor-session.js";
  import {
    pendingSuggestionExtension,
    setPendingSuggestionInView,
    type PendingSuggestionRange,
  } from "./pending-suggestion.js";

  interface Props {
    content: string;
    mode?: "draft" | "revise" | "read";
    canonIndex?: CanonIndex | null;
    pendingSuggestion?: PendingSuggestionRange | null;
    restoreViewState?: FileViewState | null;
    awaitPresentation?: boolean;
    revealed?: boolean;
    onchange?: (value: string) => void;
    onselectionchange?: (change: EditorSelectionChange) => void;
    onviewstatechange?: (state: FileViewState) => void;
    onviewrestored?: () => void;
    onpresentationprepare?: () => void;
    onpresentationready?: () => void;
    onpendingaccept?: () => void;
    onpendingreject?: () => void;
  }

  let {
    content,
    mode = "draft",
    canonIndex = null,
    pendingSuggestion = null,
    restoreViewState = null,
    awaitPresentation = false,
    revealed = true,
    onchange,
    onselectionchange,
    onviewstatechange,
    onviewrestored,
    onpresentationprepare,
    onpresentationready,
    onpendingaccept,
    onpendingreject,
  }: Props = $props();

  let host: HTMLDivElement | undefined = $state();
  let view = $state<EditorView | undefined>();
  let currentSelection = $state<EditorSelection | null>(null);
  let syncingFromProp = false;
  let scrollSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let viewStateSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let presentationSignalled = false;

  function runPresentationPass(notifyReady = false) {
    if (!view) return;
    refreshMarkdownPreview(view, { fullDocument: notifyReady });
    if (
      !shouldNotifyPresentationLifecycle(
        notifyReady,
        awaitPresentation,
        presentationSignalled,
      )
    ) {
      return;
    }
    onpresentationprepare?.();
    queueMicrotask(() => {
      queueMicrotask(() => {
        if (!view || presentationSignalled) return;
        presentationSignalled = true;
        onpresentationready?.();
      });
    });
  }

  function reportViewState(state: EditorState) {
    if (!view || syncingFromProp) return;
    const { from, to } = state.selection.main;
    onviewstatechange?.({
      caret: { from, to },
      scrollTop: view.scrollDOM.scrollTop,
    });
  }

  function scheduleViewStateReport(state: EditorState) {
    if (!view || syncingFromProp) return;
    clearTimeout(viewStateSaveTimer);
    viewStateSaveTimer = setTimeout(() => reportViewState(state), 500);
  }

  function reportSelection(state: EditorState, selectionSet = false) {
    const { from, to } = state.selection.main;
    const selection = readEditorSelection(state.doc.toString(), from, to);
    currentSelection = selection;
    onselectionchange?.({ caret: { from, to }, selection });
    if (selectionSet) scheduleViewStateReport(state);
  }

  export function getSelection(): EditorSelection | null {
    if (view) {
      const { from, to } = view.state.selection.main;
      return readEditorSelection(view.state.doc.toString(), from, to);
    }
    return currentSelection;
  }
  const editableCompartment = new Compartment();
  const canonCompartment = new Compartment();
  const tableVisualCompartment = new Compartment();

  const pendingBridge = {
    onAccept: () => onpendingaccept?.(),
    onReject: () => onpendingreject?.(),
  };

  $effect(() => {
    pendingBridge.onAccept = () => onpendingaccept?.();
    pendingBridge.onReject = () => onpendingreject?.();
  });

  $effect(() => {
    if (!host) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !syncingFromProp) {
        onchange?.(update.state.doc.toString());
      }
      if (
        !syncingFromProp &&
        (update.selectionSet || update.docChanged)
      ) {
        reportSelection(update.state, update.selectionSet);
      }
    });

    const initialContent = untrack(() => content);
    const initialMode = untrack(() => mode);
    const initialCanon = untrack(() => canonIndex);
    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        lineNumbers(),
        history(),
        markdown({ base: markdownLanguage }),
        keymap.of([
          { key: "Mod-b", run: toggleBold },
          { key: "Mod-i", run: toggleItalic },
          { key: "Mod-c", run: copyToClipboard },
          { key: "Mod-x", run: cutToClipboard },
          { key: "Mod-v", run: pasteFromClipboard },
          { key: "Mod-a", run: selectAll },
          ...defaultKeymap,
          ...historyKeymap,
        ]),
        markdownLivePreview(),
        tableVisualCompartment.of([
          tableVisualModeFacet.of(initialMode !== "read"),
          markdownTableVisual(),
        ]),
        EditorView.lineWrapping,
        updateListener,
        pendingSuggestionExtension({
          onAccept: () => pendingBridge.onAccept(),
          onReject: () => pendingBridge.onReject(),
        }),
        editableCompartment.of(EditorView.editable.of(initialMode !== "read")),
        canonCompartment.of([
          canonHoverExtension(initialCanon),
          wikilinkAutocomplete(initialCanon),
        ]),
        EditorView.theme({
          "&": {
            height: "100%",
            fontSize: "17px",
            fontFamily: "var(--font-prose)",
          },
          ".cm-content": {
            padding: "1.5rem 2rem 3rem",
            maxWidth: "42rem",
            margin: "0 auto",
          },
          ".cm-gutters": {
            backgroundColor: "transparent",
            border: "none",
            color: "var(--text-muted)",
          },
          ".cm-activeLine": {
            backgroundColor: "color-mix(in srgb, var(--accent) 8%, transparent)",
          },
          ".cm-md-mark-hidden": {
            fontSize: "0",
            lineHeight: "0",
            width: "0",
            display: "inline-block",
            overflow: "hidden",
            verticalAlign: "baseline",
            color: "transparent",
            caretColor: "var(--text)",
          },
          ".cm-md-strong": { fontWeight: "700" },
          ".cm-md-emphasis": { fontStyle: "italic" },
          ".cm-md-strikethrough": { textDecoration: "line-through" },
          ".cm-md-sup": { verticalAlign: "super", fontSize: "0.75em" },
          ".cm-md-sub": { verticalAlign: "sub", fontSize: "0.75em" },
          ".cm-md-link": {
            color: "var(--accent)",
            textDecoration: "underline",
          },
          ".cm-md-image-alt": {
            color: "var(--text-muted)",
            fontStyle: "italic",
          },
          ".cm-md-inline-code": {
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            fontSize: "0.9em",
            backgroundColor: "color-mix(in srgb, var(--accent) 10%, transparent)",
            borderRadius: "4px",
            padding: "0.1em 0.25em",
          },
          ".cm-md-fenced-code": {
            fontFamily: "var(--font-mono, ui-monospace, monospace)",
            fontSize: "0.9em",
            backgroundColor: "color-mix(in srgb, var(--accent) 7%, transparent)",
            borderRadius: "6px",
          },
          ".cm-md-blockquote": {
            borderLeft: "3px solid var(--border)",
            paddingLeft: "0.75rem",
            color: "var(--text-muted)",
          },
          ".cm-md-table-header": { fontWeight: "700" },
          ".cm-md-table-cell": { padding: "0 0.35em" },
          ".cm-md-hr": {
            color: "transparent",
            borderBottom: "1px solid var(--border)",
            display: "inline-block",
            width: "100%",
            lineHeight: "inherit",
            fontSize: "1em",
            userSelect: "none",
          },
          ".cm-md-h1": { fontSize: "2em", fontWeight: "700", lineHeight: "1.2" },
          ".cm-md-h2": { fontSize: "1.6em", fontWeight: "700", lineHeight: "1.25" },
          ".cm-md-h3": { fontSize: "1.35em", fontWeight: "600", lineHeight: "1.3" },
          ".cm-md-h4": { fontSize: "1.15em", fontWeight: "600", lineHeight: "1.35" },
          ".cm-md-h5": { fontSize: "1.05em", fontWeight: "600", lineHeight: "1.4" },
          ".cm-md-h6": {
            fontSize: "1em",
            fontWeight: "600",
            color: "var(--text-muted)",
            lineHeight: "1.4",
          },
          ".cm-ai-pending": {
            backgroundColor:
              "color-mix(in srgb, var(--accent) 18%, transparent)",
            borderRadius: "2px",
          },
          ".cm-ai-pending-controls": {
            display: "inline-flex",
            gap: "0.25rem",
            marginLeft: "0.35rem",
            verticalAlign: "middle",
            fontFamily: "var(--font-ui)",
            fontSize: "0.72rem",
          },
          ".cm-ai-pending-controls button": {
            padding: "0.15rem 0.45rem",
            borderRadius: "4px",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            color: "var(--text)",
            cursor: "pointer",
            boxShadow: "0 1px 4px rgba(42, 24, 16, 0.12)",
          },
          ".cm-ai-pending-accept": {
            borderColor: "var(--accent)",
            background: "var(--accent)",
            color: "#fff",
          },
        }),
      ],
    });

    const editor = new EditorView({ state, parent: host });
    view = editor;
    presentationSignalled = false;
    reportSelection(editor.state);

    const onScroll = () => {
      if (syncingFromProp) return;
      clearTimeout(scrollSaveTimer);
      scrollSaveTimer = setTimeout(() => {
        scheduleViewStateReport(editor.state);
      }, 300);
    };
    editor.scrollDOM.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(scrollSaveTimer);
      clearTimeout(viewStateSaveTimer);
      editor.scrollDOM.removeEventListener("scroll", onScroll);
      currentSelection = null;
      editor.destroy();
      view = undefined;
    };
  });

  function selectionFromRestore(
    restore: FileViewState | null,
    docLength: number,
  ): CMSelection {
    if (restore && restore.caret.from <= docLength) {
      return restore.caret.from === restore.caret.to
        ? CMSelection.cursor(restore.caret.from)
        : CMSelection.single(restore.caret.from, restore.caret.to);
    }
    return CMSelection.cursor(0);
  }

  $effect(() => {
    if (!view) return;
    const current = view.state.doc.toString();
    if (!shouldReplaceEditorDocument(current, content)) return;

    syncingFromProp = true;
    view.dispatch({
      changes: { from: 0, to: current.length, insert: content },
      selection: CMSelection.cursor(0),
    });
    syncingFromProp = false;
  });

  $effect(() => {
    if (!view || !restoreViewState) return;
    const current = view.state.doc.toString();
    if (shouldReplaceEditorDocument(current, content)) return;

    const restore = restoreViewState;
    onviewrestored?.();

    syncingFromProp = true;
    view.dispatch({
      selection: selectionFromRestore(restore, view.state.doc.length),
    });
    requestAnimationFrame(() => {
      if (!view) return;
      view.scrollDOM.scrollTop = restore.scrollTop;
      syncingFromProp = false;
      reportViewState(view.state);
      requestAnimationFrame(() => runPresentationPass(false));
    });
  });

  $effect(() => {
    if (!view || !revealed) return;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => runPresentationPass(awaitPresentation));
    });
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({
      effects: editableCompartment.reconfigure(
        EditorView.editable.of(mode !== "read"),
      ),
    });
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({
      effects: tableVisualCompartment.reconfigure([
        tableVisualModeFacet.of(mode !== "read"),
        markdownTableVisual(),
      ]),
    });
  });

  $effect(() => {
    if (!view) return;
    view.dispatch({
      effects: canonCompartment.reconfigure([
        canonHoverExtension(canonIndex),
        wikilinkAutocomplete(canonIndex),
      ]),
    });
  });

  $effect(() => {
    if (!view) return;
    setPendingSuggestionInView(view, pendingSuggestion);
  });

</script>

<div class="editor-host" bind:this={host} data-mode={mode}></div>

<style>
  .editor-host {
    height: 100%;
    overflow: hidden;
    background: var(--surface-paper);
    background-size: cover;
    box-shadow: var(--shadow-panel-inset);
  }

  :global(.canon-tooltip) {
    max-width: 280px;
    padding: 0.6rem 0.75rem;
    background: var(--surface-paper);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 6px 20px rgba(42, 24, 16, 0.18), var(--shadow-panel-inset);
    font-family: var(--font-ui);
    font-size: 0.8rem;
  }

  :global(.canon-tooltip strong) {
    display: block;
    margin-bottom: 0.25rem;
    color: var(--accent);
  }

  :global(.canon-tooltip p) {
    margin: 0 0 0.35rem;
    line-height: 1.4;
    color: var(--text);
  }

  :global(.canon-tooltip .path) {
    font-size: 0.7rem;
    color: var(--text-muted);
  }

  :global(.cm-md-table-panel) {
    margin: 0.85rem 0;
    border: 1px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
    background: var(--surface-paper, var(--bg-elevated));
    box-shadow: 0 1px 3px rgba(42, 24, 16, 0.06);
  }

  :global(.cm-md-table-toolbar) {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    padding: 0.35rem 0.45rem;
    border-bottom: 1px solid var(--border);
    background: color-mix(in srgb, var(--accent) 7%, transparent);
  }

  :global(.cm-md-table-src-btn),
  :global(.cm-md-table-visual-btn) {
    font-family: var(--font-ui);
    font-size: 0.72rem;
    font-weight: 500;
    padding: 0.28rem 0.55rem;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: var(--surface-paper, #fff);
    color: var(--text);
    cursor: pointer;
  }

  :global(.cm-md-table-src-btn:hover),
  :global(.cm-md-table-visual-btn:hover) {
    border-color: var(--accent);
    color: var(--accent);
  }

  :global(.cm-md-table-html) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.94em;
  }

  :global(.cm-md-table-html th),
  :global(.cm-md-table-html td) {
    border: 1px solid var(--border);
    padding: 0.45rem 0.6rem;
    min-width: 2.25rem;
    vertical-align: top;
    text-align: start;
  }

  :global(.cm-md-table-html th) {
    background: color-mix(in srgb, var(--accent) 9%, transparent);
    font-weight: 600;
  }

  :global(.cm-md-table-html tr:nth-child(even) td) {
    background: color-mix(in srgb, var(--text) 3%, transparent);
  }

  :global(.cm-md-table-parse-fallback) {
    margin: 0;
    padding: 0.5rem 0.65rem;
    font-family: var(--font-mono, ui-monospace, monospace);
    font-size: 0.8rem;
    overflow-x: auto;
    white-space: pre-wrap;
  }

  :global(.cm-md-table-raw-float) {
    pointer-events: auto;
  }

</style>
