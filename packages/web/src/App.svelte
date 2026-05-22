<script lang="ts">
  import { onMount } from "svelte";
  import type { Host, InscrivaBridge, LlmTaskId } from "@inscriva/bridge";
  import {
    anchorSidecarPath,
    appendNote,
    buildBookTree,
    buildMovedPath,
    buildNewFilePath,
    buildRenamedPath,
    defaultNewFileDirectory,
    buildCanonIndex,
    buildSidecar,
    findUnlinkedPlants,
    NOTES_PATH,
    parseNotesJsonl,
    parseParagraphs,
    pairChapters,
    reconcileAnchors,
    serialiseNotes,
    type CanonIndex,
    type ChapterPair,
    type LineNote,
    type RevisionPassId,
    type TreeNode,
  } from "@inscriva/indexer";
  import { loadCapabilities, resolveBridge } from "./lib/bridge-client.js";

  type MenuAction =
    | "open_book"
    | "new_book"
    | "pull"
    | "close_book"
    | "mode_draft"
    | "mode_revise"
    | "mode_read";
  import type { BridgeCapabilities } from "@inscriva/bridge";
  import ChapterPanel from "./lib/ChapterPanel.svelte";
  import ActionsPanel from "./lib/ActionsPanel.svelte";
  import Editor from "./lib/Editor.svelte";
  import FileTree from "./lib/FileTree.svelte";
  import FileRenameField from "./lib/FileRenameField.svelte";
  import NotesGutter from "./lib/NotesGutter.svelte";
  import AssistPanel from "./lib/AssistPanel.svelte";
  import RevisionPanel from "./lib/RevisionPanel.svelte";
  import SettingsModal from "./lib/SettingsModal.svelte";
  import WelcomeScreen from "./lib/WelcomeScreen.svelte";
  import AppLoadOverlay from "./lib/AppLoadOverlay.svelte";
  import { parseChapterFocus } from "./lib/outline-parser.js";
  import {
    draftExcerptForAssist,
    type EditorSelection,
  } from "./lib/editor-selection.js";
  import {
    missingLlmProviderMessage,
    modelForProvider,
    pickLlmProvider,
  } from "./lib/llm-settings.js";
  import type { WriteWithAiGenerate } from "./lib/write-with-ai.js";
  import { assembleWritingContext } from "./lib/writing-context.js";
  import { buildWriteWithAiLlmRequest } from "./lib/write-with-ai-request.js";
  import type { PendingSuggestionRange } from "./lib/pending-suggestion.js";
  import { cancelPendingFileSave } from "./lib/open-file.js";
  import {
    clampCaret,
    loadBookEditorSession,
    loadLastBookPath,
    renameFileInSession,
    saveFileViewState,
    saveLastBookPath,
    touchActiveFile,
    type FileViewState,
  } from "./lib/editor-session.js";
  import {
    buildEditorSearch,
    offsetToLine,
    parseEditorLocation,
    replaceEditorLocation,
    resolveOpenFilePath,
    viewStateForLine,
    type EditorLocation,
  } from "./lib/editor-location.js";
  import {
    createMockBook,
    MOCK_BOOK_PATH,
    MOCK_CHAPTER_PATH,
    MOCK_OUTLINE_PATH,
  } from "./lib/mock-book.js";

  type EditorMode = "draft" | "revise" | "read";

  let bridge = $state<InscrivaBridge | null>(null);
  let capabilities = $state<BridgeCapabilities>({
    folderPicker: false,
    gitClone: false,
    gitPull: false,
    gitInspect: false,
    gitOAuth: false,
  });
  let host = $state<Host>("browser");
  let gitMessage = $state("");
  let bookPath = $state<string | null>(null);
  let bookTitle = $state("");
  let recents = $state<string[]>([]);
  let filePaths = $state<string[]>([]);
  let fileTree = $state<TreeNode | null>(null);
  let chapterPairs = $state<ChapterPair[]>([]);
  let canonIndex = $state<CanonIndex | null>(null);
  let activePath = $state<string | undefined>();
  let editorContent = $state("");
  let editorSelection = $state<EditorSelection | null>(null);
  let editorCaret = $state({ from: 0, to: 0 });
  let pendingSuggestion = $state<PendingSuggestionRange | null>(null);
  let outlineContent = $state("");
  let mode = $state<EditorMode>("draft");
  let gitStatus = $state({ ahead: 0, behind: 0, dirty: false });
  let anchorSummary = $state("");
  let allNotes = $state<LineNote[]>([]);
  let activeAnchorId = $state<string | undefined>();
  let saveTimer: ReturnType<typeof setTimeout> | undefined;
  let viewStateSaveTimer: ReturnType<typeof setTimeout> | undefined;
  let urlLineTimer: ReturnType<typeof setTimeout> | undefined;
  let urlEditorLocation: EditorLocation = { file: null, line: null };
  let restoreViewState = $state<FileViewState | null>(null);
  let latestViewState: FileViewState | null = null;
  let autosaveTimer: ReturnType<typeof setInterval> | undefined;
  let unwatch: (() => void) | undefined;
  let contentBeforeEdit = $state("");
  let showSettings = $state(false);
  let showAssist = $state(false);
  let assistTaskId = $state<LlmTaskId>("draft-scene");
  let revisionChecked = $state<Partial<Record<RevisionPassId, boolean>>>({});
  let currentRevisionPass = $state<RevisionPassId>("structure");
  let welcomeTab = $state<"open" | "git" | "new">("open");
  let loadState = $state<{ title: string; detail?: string } | null>({
    title: "Starting Inscriva",
    detail: "Connecting…",
  });
  let workspaceReady = $state(false);
  let awaitingPresentation = $state(false);
  let restoreFallbackTimer: ReturnType<typeof setTimeout> | undefined;

  function fileDisplayName(path: string): string {
    return path.split("/").pop()?.replace(/\.md$/, "") ?? path;
  }

  function setLoadState(title: string, detail?: string) {
    loadState = { title, detail };
  }

  function completeWorkspaceOpen() {
    clearTimeout(restoreFallbackTimer);
    awaitingPresentation = false;
    workspaceReady = true;
    loadState = null;
  }

  function signalEditorReady() {
    if (!awaitingPresentation) return;
    restoreViewState = null;
    completeWorkspaceOpen();
  }

  function finishWorkspaceOpen(filePath?: string) {
    clearTimeout(restoreFallbackTimer);
    awaitingPresentation = true;
    workspaceReady = false;
    if (restoreViewState) {
      setLoadState(
        "Restoring your place",
        filePath ? fileDisplayName(filePath) : undefined,
      );
    } else {
      setLoadState(
        "Preparing editor",
        filePath ? fileDisplayName(filePath) : undefined,
      );
    }
    restoreFallbackTimer = setTimeout(() => signalEditorReady(), 3000);
  }

  const focus = $derived(parseChapterFocus(outlineContent));
  const activePair = $derived(
    chapterPairs.find((p) => p.draft === activePath || p.outline === activePath),
  );
  const chapterTitle = $derived(
    activePair?.key
      ? `${activePair.key}${focus.storyQuestion ? "" : ""}`
      : activePath?.split("/").pop()?.replace(/\.md$/, "") ?? "Chapter",
  );
  const paragraphNotes = $derived(
    activeAnchorId
      ? allNotes.filter((n) => n.anchorId === activeAnchorId)
      : [],
  );
  const showNotesGutter = $derived(mode === "revise" && activePair?.draft === activePath);
  const unlinkedPlants = $derived(
    showNotesGutter ? findUnlinkedPlants(editorContent, outlineContent) : [],
  );

  function handleRevisionAssist(taskId: LlmTaskId) {
    assistTaskId = taskId;
    showAssist = true;
  }

  function handleRevisionChecked(passId: RevisionPassId, checked: boolean) {
    revisionChecked = { ...revisionChecked, [passId]: checked };
  }
  const selectionText = $derived(editorSelection?.text);
  const isDemoBook = $derived(bookPath === MOCK_BOOK_PATH);

  function persistViewState(state: FileViewState) {
    latestViewState = state;
    if (!bookPath || !activePath || isDemoBook) return;
    clearTimeout(viewStateSaveTimer);
    viewStateSaveTimer = setTimeout(() => {
      saveFileViewState(bookPath!, activePath!, state);
    }, 300);
  }

  function flushViewStateSave() {
    if (!bookPath || !activePath || isDemoBook) return;
    clearTimeout(viewStateSaveTimer);
    const state = latestViewState ?? {
      caret: editorCaret,
      scrollTop: 0,
    };
    saveFileViewState(bookPath, activePath, state);
  }

  function syncEditorUrl(file: string | null, line?: number | null) {
    if (typeof window === "undefined" || isDemoBook) return;
    const preserve = new URLSearchParams(location.search);
    preserve.delete("file");
    preserve.delete("line");
    replaceEditorLocation(
      buildEditorSearch({ file, line: line ?? null, preserve }),
    );
  }

  function scheduleUrlLineSync() {
    if (!activePath || isDemoBook) return;
    clearTimeout(urlLineTimer);
    urlLineTimer = setTimeout(() => {
      if (!activePath) return;
      syncEditorUrl(activePath, offsetToLine(editorContent, editorCaret.from));
    }, 400);
  }
  const assistWritingContext = $derived(
    assembleWritingContext({
      editorContent,
      outlineContent,
      canonIndex,
      offset: editorSelection?.to ?? editorCaret.to,
      workingText: editorSelection?.text,
    }),
  );

  const draftExcerpt = $derived(
    assistWritingContext.draftExcerpt ??
      draftExcerptForAssist(editorContent, editorSelection, activeAnchorId),
  );

  const writeWithAiGenerate: WriteWithAiGenerate | null = $derived.by(() => {
    if (!bridge || !bookPath) return null;
    const b = bridge;
    const bookId = bookPath;
    const chapterKey = activePair?.key;
    const outline = outlineContent;
    const content = editorContent;
    const canon = canonIndex;
    return async function* ({ kind, prompt, text, to, maxOutputTokens }) {
      const writing = assembleWritingContext({
        editorContent: content,
        outlineContent: outline,
        canonIndex: canon,
        offset: to,
        workingText: text,
      });

      const providers = await b.listProviders();
      const provider = pickLlmProvider(providers);
      if (!provider) throw new Error(missingLlmProviderMessage());

      const request = buildWriteWithAiLlmRequest({
        bookId,
        chapterKey,
        provider,
        model: modelForProvider(provider),
        kind,
        text,
        prompt,
        writing,
        maxOutputTokens,
      });

      yield* b.llmStream(request);
    };
  });

  onMount(() => {
    urlEditorLocation = parseEditorLocation(location.search);

    const onBeforeUnload = () => {
      flushViewStateSave();
      if (activePath && !isDemoBook) {
        syncEditorUrl(activePath, offsetToLine(editorContent, editorCaret.from));
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);

    let unbindMenu = () => {};

    void (async () => {
      const resolved = await resolveBridge();
      bridge = resolved.bridge;
      host = resolved.host;
      capabilities = await loadCapabilities(resolved.bridge);
      recents = await resolved.bridge.getRecents();

      if (
        typeof window !== "undefined" &&
        ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
      ) {
        const tauriBridge = await import("@inscriva/bridge/tauri-bridge");
        if (typeof tauriBridge.bindTauriMenu === "function") {
          unbindMenu = await tauriBridge.bindTauriMenu(handleMenuAction);
        }
      }

      const params = new URLSearchParams(location.search);
      if (params.get("demo") === "1") {
        loadState = null;
        await openDemo();
      } else {
        const lastBook = loadLastBookPath();
        if (lastBook && recents.includes(lastBook)) {
          void handleBookOpened(lastBook).catch(() => {
            bookPath = null;
            workspaceReady = false;
            awaitingPresentation = false;
            loadState = null;
            // Book may have moved; user can open from recents.
          });
        } else {
          loadState = null;
        }
      }
    })();

    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimeout(urlLineTimer);
      clearTimeout(restoreFallbackTimer);
      flushViewStateSave();
      unbindMenu();
    };
  });

  async function handleMenuAction(action: MenuAction) {
    if (!bridge) return;

    switch (action) {
      case "open_book": {
        if (!bridge.pickBookFolder) return;
        const chosen = await bridge.pickBookFolder({ prompt: "Open book folder" });
        if (chosen) await handleBookOpened(chosen);
        break;
      }
      case "new_book":
        bookPath = null;
        welcomeTab = "new";
        break;
      case "close_book":
        bookPath = null;
        syncEditorUrl(null);
        break;
      case "pull":
        await pullFromRemote();
        break;
      case "mode_draft":
        mode = "draft";
        break;
      case "mode_revise":
        mode = "revise";
        break;
      case "mode_read":
        mode = "read";
        break;
    }
  }

  async function openDemo() {
    const resolved = await resolveBridge({ demo: true });
    bridge = resolved.bridge;
    host = "browser";
    const mock = createMockBook();
    await bridge.openBook(mock.path);
    bookPath = mock.path;
    bookTitle = mock.title;
    filePaths = [...mock.files.keys()];
    fileTree = buildBookTree(filePaths);
    chapterPairs = pairChapters(filePaths);
    canonIndex = buildCanonIndex(mock.files);
    activePath = MOCK_CHAPTER_PATH;
    editorContent = mock.files.get(MOCK_CHAPTER_PATH) ?? "";
    outlineContent = mock.files.get(MOCK_OUTLINE_PATH) ?? "";
    contentBeforeEdit = editorContent;
    workspaceReady = true;
    loadState = null;
    await loadNotes();
    reconcileCurrent();
  }

  async function handleBookOpened(path: string) {
    if (!bridge) return;
    flushViewStateSave();
    workspaceReady = false;
    setLoadState("Opening book", "Preparing your workspace…");
    bookPath = path;
    const handle = await bridge.openBook(path);
    bookTitle = handle.title;
    setLoadState("Opening book", bookTitle);
    await bridge.addRecent(path);
    recents = await bridge.getRecents();
    if (path !== MOCK_BOOK_PATH) saveLastBookPath(path);
    setLoadState("Opening book", "Loading file list…");
    await refreshBookListing();
    const session = path === MOCK_BOOK_PATH ? null : loadBookEditorSession(path);
    const firstDraft = chapterPairs.find((p) => p.draft)?.draft ?? null;
    const loc = urlEditorLocation;
    const target = resolveOpenFilePath({
      filePaths,
      urlFile: loc.file,
      sessionFile: session?.activePath ?? null,
      fallbackFile: firstDraft,
    });
    const line =
      loc.file && target === loc.file ? loc.line : null;
    urlEditorLocation = { file: null, line: null };
    if (target) {
      setLoadState("Opening chapter", fileDisplayName(target));
      await openFile(target, { line });
      finishWorkspaceOpen(target);
    } else {
      completeWorkspaceOpen();
    }
    startAutosave();
    void loadBookSupplementInBackground();
  }

  async function refreshBookListing() {
    if (!bridge) return;
    filePaths = await bridge.listFiles();
    fileTree = buildBookTree(filePaths);
    chapterPairs = pairChapters(filePaths);
  }

  async function refreshBook() {
    await refreshBookListing();
    await Promise.all([rebuildCanonIndex(), loadNotes()]);
  }

  async function loadBookSupplementInBackground() {
    if (!bridge) return;
    await Promise.all([rebuildCanonIndex(), loadNotes(), pullFromRemote()]);
  }

  async function rebuildCanonIndex() {
    if (!bridge) return;
    const canonPaths = filePaths.filter(
      (p) => p.endsWith(".md") && p.startsWith("00 Canon/"),
    );
    if (canonPaths.length === 0) {
      canonIndex = buildCanonIndex(new Map());
      return;
    }
    const entries = await Promise.all(
      canonPaths.map(async (p) => [p, await bridge!.readFile(p)] as const),
    );
    canonIndex = buildCanonIndex(new Map(entries));
  }

  async function loadNotes() {
    if (!bridge) return;
    try {
      const raw = await bridge.readFile(NOTES_PATH);
      allNotes = parseNotesJsonl(raw);
    } catch {
      allNotes = [];
    }
  }

  async function openFile(path: string, options?: { line?: number | null }) {
    if (!bridge) return;
    flushViewStateSave();
    cancelPendingFileSave(saveTimer);
    saveTimer = undefined;

    const pair = chapterPairs.find((p) => p.draft === path || p.outline === path);
    const outlinePath =
      pair?.outline ??
      (path.includes("Chapter Outlines/") ? path : undefined);

    const [text, outlineText] = await Promise.all([
      bridge.readFile(path),
      outlinePath && outlinePath !== path
        ? bridge.readFile(outlinePath)
        : Promise.resolve(null),
    ]);

    editorContent = text;
    contentBeforeEdit = text;
    activePath = path;
    if (bookPath && bookPath !== MOCK_BOOK_PATH) {
      touchActiveFile(bookPath, path);
    }

    const saved =
      bookPath && bookPath !== MOCK_BOOK_PATH
        ? loadBookEditorSession(bookPath)?.files[path]
        : undefined;
    const restored = viewStateForLine(text, options?.line, saved);
    if (restored) {
      const caret = clampCaret(restored.caret, text.length);
      const viewState = { caret, scrollTop: restored.scrollTop };
      editorCaret = caret;
      editorSelection = null;
      restoreViewState = viewState;
      latestViewState = viewState;
    } else {
      editorSelection = null;
      editorCaret = { from: 0, to: 0 };
      restoreViewState = null;
      latestViewState = null;
    }

    syncEditorUrl(path, options?.line ?? offsetToLine(text, editorCaret.from));

    if (outlineText !== null) {
      outlineContent = outlineText;
    } else if (path.includes("Chapter Outlines/")) {
      outlineContent = editorContent;
    }

    if (pair?.draft === path) {
      const paragraphs = parseParagraphs(editorContent);
      if (paragraphs[0]) {
        activeAnchorId = `anchor-${paragraphs[0].index}`;
      }
    }
    reconcileCurrent();
  }

  function reconcileCurrent() {
    if (!activePath) return;
    const paragraphs = parseParagraphs(editorContent);
    const ids = paragraphs.map(
      (_, i) => `${activePath}:p:${String(i + 1).padStart(3, "0")}`,
    );
    const sidecar = buildSidecar(activePath, paragraphs, ids);
    const reconciled = reconcileAnchors(contentBeforeEdit, editorContent, sidecar);
    const attached = reconciled.anchors.filter((a) => a.status === "attached").length;
    const orphans = reconciled.anchors.filter((a) => a.status === "orphan").length;
    anchorSummary = `${attached} attached · ${orphans} orphan`;
    if (reconciled.anchors[0]) {
      activeAnchorId = reconciled.anchors[0].id;
    }
  }

  async function handleEditorChange(value: string) {
    editorContent = value;
    reconcileCurrent();

    if (!bridge || !activePath) return;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => persistFile(activePath!, value), 600);
  }

  function applyAiWriting(content: string, pending: PendingSuggestionRange) {
    editorContent = content;
    pendingSuggestion = pending;
    reconcileCurrent();
    if (bridge && activePath) {
      void persistFile(activePath, content);
    }
  }

  function clearPendingSuggestion() {
    pendingSuggestion = null;
  }

  $effect(() => {
    activePath;
    pendingSuggestion = null;
  });

  function applyAssistText(text: string) {
    if (editorSelection) {
      const { from, to } = editorSelection;
      editorContent =
        editorContent.slice(0, from) + text + editorContent.slice(to);
    } else if (selectionText) {
      const index = editorContent.indexOf(selectionText);
      if (index !== -1) {
        editorContent =
          editorContent.slice(0, index) +
          text +
          editorContent.slice(index + selectionText.length);
      } else {
        const separator =
          editorContent.length > 0 && !editorContent.endsWith("\n") ? "\n\n" : "";
        editorContent = editorContent + separator + text;
      }
    } else {
      const separator =
        editorContent.length > 0 && !editorContent.endsWith("\n") ? "\n\n" : "";
      editorContent = editorContent + separator + text;
    }
    reconcileCurrent();
    if (bridge && activePath) {
      void persistFile(activePath, editorContent);
    }
  }

  const defaultCreateDir = $derived(
    defaultNewFileDirectory(filePaths, activePath),
  );

  async function handleCreateFile(dir: string, base: string) {
    if (!bridge) return;
    let path: string;
    try {
      path = buildNewFilePath(dir, base);
    } catch (e) {
      gitMessage = e instanceof Error ? e.message : "Invalid file name";
      return;
    }
    if (filePaths.includes(path)) {
      gitMessage = "A file with that name already exists";
      return;
    }

    try {
      await bridge.writeFile(path, "");
      await refreshBook();
      await openFile(path);
      gitStatus = await bridge.gitStatus();
      gitMessage = "";
    } catch (e) {
      gitMessage = e instanceof Error ? e.message : "Could not create file";
    }
  }

  async function relocateFile(
    from: string,
    to: string,
    failureMessage = "Could not move file",
  ) {
    if (!bridge || to === from) return;

    cancelPendingFileSave(saveTimer);
    saveTimer = undefined;

    try {
      await bridge.renameFile(from, to);
      if (bookPath && bookPath !== MOCK_BOOK_PATH) {
        renameFileInSession(bookPath, from, to);
      }
      if (activePath === from) {
        activePath = to;
        syncEditorUrl(to, offsetToLine(editorContent, editorCaret.from));
      }
      await refreshBook();
      gitStatus = await bridge.gitStatus();
      gitMessage = "";
    } catch (e) {
      gitMessage = e instanceof Error ? e.message : failureMessage;
    }
  }

  async function handleFileRename(from: string, newBase: string) {
    let to: string;
    try {
      to = buildRenamedPath(from, newBase);
    } catch (e) {
      gitMessage = e instanceof Error ? e.message : "Invalid file name";
      return;
    }
    await relocateFile(from, to, "Rename failed");
  }

  async function handleFileMove(from: string, toDir: string) {
    let to: string;
    try {
      to = buildMovedPath(from, toDir);
    } catch (e) {
      gitMessage = e instanceof Error ? e.message : "Invalid move";
      return;
    }
    if (filePaths.includes(to)) {
      gitMessage = "A file with that name already exists in that folder";
      return;
    }
    await relocateFile(from, to);
  }

  async function persistFile(path: string, content: string) {
    if (!bridge) return;
    try {
      await bridge.writeFile(path, content);
    } catch (e) {
      gitMessage =
        e instanceof Error ? e.message : "Could not save — is the dev bridge running?";
      return;
    }
    contentBeforeEdit = content;

    const paragraphs = parseParagraphs(content);
    const ids = paragraphs.map(
      (_, i) => `${path}:p:${String(i + 1).padStart(3, "0")}`,
    );
    const sidecar = buildSidecar(path, paragraphs, ids);
    const reconciled = reconcileAnchors(contentBeforeEdit, content, sidecar);
    await bridge.writeFile(
      anchorSidecarPath(path),
      JSON.stringify(
        { file: path, version: reconciled.version, anchors: reconciled.anchors },
        null,
        2,
      ),
    );
    gitStatus = await bridge.gitStatus();
  }

  async function addNote(text: string) {
    if (!bridge || !activeAnchorId) return;
    const note: LineNote = {
      id: `n-${Date.now()}`,
      anchorId: activeAnchorId,
      type: "comment",
      text,
      created: new Date().toISOString(),
    };
    await persistNote(note);
  }

  async function persistNote(note: LineNote) {
    if (!bridge) return;
    allNotes = [...allNotes, note];
    await bridge.writeFile(NOTES_PATH, serialiseNotes(allNotes));
  }

  async function pullFromRemote() {
    if (!bridge || !capabilities.gitPull || !workspaceReady) return;
    gitMessage = "Pulling…";
    try {
      await bridge.gitPull();
      gitMessage = "";
      await refreshBook();
      gitStatus = await bridge.gitStatus();
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      gitMessage = detail || "Pull failed — check remote access";
    }
  }

  function startAutosave() {
    if (!bridge) return;
    clearInterval(autosaveTimer);
    autosaveTimer = setInterval(async () => {
      if (!bridge) return;
      const status = await bridge.gitStatus();
      if (status.dirty) {
        await bridge.gitAutosave();
        gitStatus = await bridge.gitStatus();
      }
    }, 30_000);
  }

  function startWatch() {
    unwatch?.();
    if (!bridge) return;
    unwatch = bridge.watchBook(async () => {
      await refreshBook();
    });
  }

  $effect(() => {
    if (bookPath && bridge) {
      startWatch();
      return () => unwatch?.();
    }
  });
</script>

{#if !bridge}
  <div class="app-load-shell">
    <AppLoadOverlay
      title={loadState?.title ?? "Starting Inscriva"}
      detail={loadState?.detail}
    />
  </div>
{:else if !bookPath}
  <WelcomeScreen
    {bridge}
    {capabilities}
    {recents}
    bind:tab={welcomeTab}
    onOpen={handleBookOpened}
    onDemo={openDemo}
  />
{:else}
  <div class="app" data-host={host}>
    <header class="topbar">
      <div class="brand">
        <img class="logo" src="/inscriva.svg" width="129" height="48" alt="Inscriva" />
        <span class="book-title">{bookTitle}</span>
      </div>

      <nav class="modes" aria-label="Editor mode">
        {#each ["draft", "revise", "read"] as m}
          <button
            type="button"
            class:active={mode === m}
            onclick={() => (mode = m as EditorMode)}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        {/each}
      </nav>

      <div class="status">
        <span class="host-badge">{host}</span>
        {#if capabilities.gitPull}
          <button type="button" class="link" onclick={pullFromRemote} title="Pull from Git remote">
            Pull
          </button>
        {/if}
        {#if gitStatus.dirty}
          <span class="git dirty">Unsaved changes</span>
        {:else}
          <span class="git">Synced</span>
        {/if}
        {#if gitMessage}
          <span class="git-msg">{gitMessage}</span>
        {/if}
        {#if anchorSummary}
          <span class="anchors">{anchorSummary}</span>
        {/if}
        <button type="button" class="link" onclick={() => (showAssist = !showAssist)}>
          {showAssist ? "Hide assist" : "Assist"}
        </button>
        <button type="button" class="link" onclick={() => (showSettings = true)}>Settings</button>
        <button
          type="button"
          class="link"
          onclick={() => {
            bookPath = null;
            syncEditorUrl(null);
          }}
        >Close book</button>
      </div>
    </header>

    <div class="workspace" class:revise={showNotesGutter}>
      {#if loadState}
        <AppLoadOverlay title={loadState.title} detail={loadState.detail} />
      {/if}
      <aside class="sidebar">
        {#if fileTree}
          <FileTree
            tree={fileTree}
            {activePath}
            defaultCreateDir={defaultCreateDir}
            onSelect={openFile}
            onRename={handleFileRename}
            onCreate={handleCreateFile}
            onMove={handleFileMove}
          />
        {/if}
      </aside>

      <main class="editor-pane" class:preparing={!workspaceReady}>
        {#if activePath && workspaceReady}
          <header class="editor-file-header">
            <FileRenameField
              path={activePath}
              onSave={(base) => handleFileRename(activePath!, base)}
              onCancel={() => {}}
            />
          </header>
        {/if}
        {#if showNotesGutter && unlinkedPlants.length}
          <div class="plant-banner" role="status">
            Unlinked plants in outline: {unlinkedPlants.join(", ")} — see Revision panel
          </div>
        {/if}
        {#if activePath}
          <Editor
            content={editorContent}
            {mode}
            {canonIndex}
            {pendingSuggestion}
            {restoreViewState}
            awaitPresentation={awaitingPresentation}
            revealed={Boolean(activePath)}
            onchange={handleEditorChange}
            onpendingaccept={clearPendingSuggestion}
            onpendingreject={clearPendingSuggestion}
            onviewrestored={() => {
              restoreViewState = null;
            }}
            onpresentationprepare={() => {
              if (!awaitingPresentation) return;
              setLoadState(
                "Styling document",
                activePath ? fileDisplayName(activePath) : undefined,
              );
            }}
            onpresentationready={signalEditorReady}
            onviewstatechange={persistViewState}
            onselectionchange={(change) => {
              editorCaret = change.caret;
              editorSelection = change.selection;
              scheduleUrlLineSync();
            }}
          />
        {/if}
      </main>

      {#if showNotesGutter}
        <NotesGutter
          notes={paragraphNotes}
          {activeAnchorId}
          onSelect={(id) => (activeAnchorId = id)}
          onAdd={addNote}
        />
      {/if}

      <aside class="right-rail">
        {#if showAssist && bookPath}
          <AssistPanel
            {bridge}
            bookId={bookPath}
            chapterKey={activePair?.key}
            taskId={assistTaskId}
            {activePath}
            {selectionText}
            {draftExcerpt}
            chapterFocus={assistWritingContext.chapterFocus}
            relevantCanon={assistWritingContext.relevantCanon}
            onapply={applyAssistText}
            onclose={() => (showAssist = false)}
          />
        {/if}
        {#if showNotesGutter}
          <RevisionPanel
            {unlinkedPlants}
            checked={revisionChecked}
            currentPassId={currentRevisionPass}
            onCheckedChange={handleRevisionChecked}
            onSelectPass={(id) => (currentRevisionPass = id)}
            onRunAssist={handleRevisionAssist}
          />
        {/if}
        <ChapterPanel {focus} {chapterTitle} showBanner={mode === "draft"} />
        <ActionsPanel
          {bridge}
          bookId={bookPath}
          activePath={activePath}
          chapterKey={activePair?.key}
          {outlineContent}
          {canonIndex}
          notes={allNotes}
          {editorContent}
          selection={editorSelection}
          caretFrom={editorCaret.from}
          caretTo={editorCaret.to}
          {mode}
          generate={writeWithAiGenerate}
          onapply={applyAiWriting}
          onaddnote={persistNote}
        />
      </aside>
    </div>

    <SettingsModal
      {bridge}
      open={showSettings}
      onclose={() => (showSettings = false)}
    />
  </div>
{/if}

<style>
  .app-load-shell {
    position: relative;
    height: 100%;
    background: var(--room-mahogany);
  }

  .app {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .topbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.5rem 1rem;
    background: linear-gradient(180deg, #4a3024 0%, #352218 48%, #2a1810 100%);
    box-shadow: var(--shadow-wood-bar);
    border-bottom: 3px solid transparent;
    border-image: repeating-linear-gradient(
        90deg,
        var(--ornament-gold-dim) 0 5px,
        #2a1810 5px 6px,
        var(--ornament-gold) 6px 11px,
        #2a1810 11px 12px
      )
      1;
    color: #ebe4dc;
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    min-width: 0;
  }

  .logo {
    display: block;
    height: 2.5rem;
    width: auto;
    flex-shrink: 0;
  }

  .book-title {
    color: rgba(235, 228, 220, 0.72);
    font-size: 0.9rem;
  }

  .modes {
    display: flex;
    gap: 0.25rem;
    margin: 0 auto;
    padding: 0.2rem;
    background: rgba(0, 0, 0, 0.25);
    border-radius: 8px;
    box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.35);
  }

  .modes button {
    border: none;
    background: transparent;
    padding: 0.35rem 0.75rem;
    border-radius: 6px;
    color: rgba(235, 228, 220, 0.55);
  }

  .modes button.active {
    background: linear-gradient(180deg, #faf6ee 0%, #e8dfd4 100%);
    color: #2a1810;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
  }

  .status {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    font-size: 0.8rem;
    color: rgba(235, 228, 220, 0.65);
  }

  .host-badge {
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.2);
    text-transform: uppercase;
    font-size: 0.65rem;
    color: rgba(235, 228, 220, 0.75);
  }

  .git.dirty {
    color: #fbbf24;
  }

  .git-msg {
    max-width: 12rem;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .link {
    border: none;
    background: transparent;
    color: #e8c896;
    text-decoration: underline;
    font-size: 0.8rem;
  }

  .workspace {
    position: relative;
    display: grid;
    grid-template-columns: var(--sidebar-width) 1fr var(--panel-width);
    flex: 1;
    min-height: 0;
  }

  .workspace.revise {
    grid-template-columns: var(--sidebar-width) 1fr 220px var(--panel-width);
  }

  .sidebar {
    --text: var(--text-on-leather);
    --text-muted: var(--text-on-leather-muted);
    --accent: var(--accent-on-leather);
    --accent-soft: var(--accent-soft-on-leather);
    --border: var(--border-on-leather);
    border-right: 1px solid rgba(0, 0, 0, 0.35);
    background: var(--surface-leather);
    background-size: cover;
    box-shadow: var(--shadow-leather-deboss);
    overflow-y: auto;
  }

  .editor-pane {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
  }

  .editor-pane.preparing :global(.editor-host) {
    opacity: 0;
    pointer-events: none;
  }

  .editor-file-header {
    flex-shrink: 0;
    padding: 0.5rem 1rem 0.35rem;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .editor-file-header :global(.rename-display) {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
  }

  .plant-banner {
    flex-shrink: 0;
    padding: 0.4rem 0.75rem;
    font-size: 0.78rem;
    background: linear-gradient(180deg, #f8eacb 0%, #e8d4a8 100%);
    border-bottom: 1px solid var(--ornament-gold-dim);
    color: #5c3d1e;
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
  }

  .right-rail {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-left: 1px solid rgba(42, 24, 16, 0.35);
    overflow: hidden;
    box-shadow: inset 4px 0 12px rgba(0, 0, 0, 0.12);
  }

  .right-rail :global(.chapter-panel) {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .right-rail :global(.actions-panel) {
    flex-shrink: 0;
  }

  @media (max-width: 1100px) {
    .workspace.revise {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr auto auto;
    }

    .sidebar {
      display: none;
    }
  }
</style>
