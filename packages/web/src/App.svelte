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
    countWords,
    defaultNewFileDirectory,
    buildCanonIndex,
    buildCastIndex,
    buildBookIndex,
    buildSidecar,
    alignmentSummaryFromReport,
    evaluateRecommendations,
    applyExpandedChapterOutline,
    defaultChapterOutlinePath,
    findMasterOutlinePath,
    findUnlinkedPlants,
    type MasterChapterEntry,
    isGoalChecked,
    NOTES_PATH,
    parseWordTarget,
    parseNotesJsonl,
    parseParagraphs,
    pairChapters,
    reconcileAnchors,
    reconcileMasterOutlineStatuses,
    appendSceneLedgerEntries,
    extractDraftSceneHeadings,
    SCENE_LEDGER_PATH,
    checkStyleGuideViolations,
    characterAppearancesPath,
    findStyleGuidePath,
    formatCharacterAppearancesMarkdown,
    parseStyleGuideRules,
    serialiseNotes,
    toggleGoalCheck,
    type AlignmentReport,
    type BookIndex,
    type CanonIndex,
    type CastCharacter,
    type CastIndex,
    type ChapterMapOverrides,
    type ChapterPair,
    type GoalChecksByChapter,
    type LineNote,
    type Recommendation,
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
  import AlignmentPanel from "./lib/AlignmentPanel.svelte";
  import CastPanel from "./lib/CastPanel.svelte";
  import CharacterSheet from "./lib/CharacterSheet.svelte";
  import ChapterPanel from "./lib/ChapterPanel.svelte";
  import ChapterBoard from "./lib/ChapterBoard.svelte";
  import ChapterRail from "./lib/ChapterRail.svelte";
  import SceneLedgerPanel from "./lib/SceneLedgerPanel.svelte";
  import ActionsPanel from "./lib/ActionsPanel.svelte";
  import Editor from "./lib/Editor.svelte";
  import FileTree from "./lib/FileTree.svelte";
  import GoalChecklist from "./lib/GoalChecklist.svelte";
  import SceneNavigator from "./lib/SceneNavigator.svelte";
  import WritingSessionStrip from "./lib/WritingSessionStrip.svelte";
  import FileRenameField from "./lib/FileRenameField.svelte";
  import NotesGutter from "./lib/NotesGutter.svelte";
  import AssistPanel from "./lib/AssistPanel.svelte";
  import RevisionPanel from "./lib/RevisionPanel.svelte";
  import StyleGuidePanel from "./lib/StyleGuidePanel.svelte";
  import ChapterMapForm from "./lib/ChapterMapForm.svelte";
  import SettingsModal from "./lib/SettingsModal.svelte";
  import WelcomeScreen from "./lib/WelcomeScreen.svelte";
  import DownloadPage from "./lib/DownloadPage.svelte";
  import {
    navigateAppRoute,
    readAppRoute,
    type AppRoute,
  } from "./lib/app-route.js";
  import { detectWritingMode, type WritingMode } from "./lib/writing-mode.js";
  import AppLoadOverlay from "./lib/AppLoadOverlay.svelte";
  import {
    appendClosedWritingSession,
    buildAlignmentReport,
    loadAlignmentReport,
    loadChapterMap,
    loadGoalChecks,
    loadPairsWithContents,
    persistAiChapterReview,
    persistAlignmentReport,
    refreshBookIndex,
    castIndexFromBookIndex,
    saveChapterMap,
    saveGoalChecks,
  } from "./lib/book-workspace.js";
  import { formatExpandOutlineContext } from "./lib/expand-outline-context.js";
  import MasterOutlineBar from "./lib/MasterOutlineBar.svelte";
  import {
    loadNavigationView,
    saveNavigationView,
    type NavigationView,
  } from "./lib/navigation-preference.js";
  import { parseChapterFocus } from "./lib/outline-parser.js";
  import { confirmDeleteFile } from "./lib/confirm-delete-file.js";
  import { createWritingSessionTracker } from "./lib/writing-session-tracker.js";
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
    deleteFileInSession,
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
  import { insertPlantReference } from "./lib/plant-link.js";
  import {
    filterRecommendations,
    loadRecommendationSettings,
    type RecommendationSettings,
  } from "./lib/recommendation-settings.js";
  import { isShareMode } from "./lib/share-mode.js";
  import { bindSyncOnResume } from "./lib/sync-on-resume.js";

  type EditorMode = "draft" | "revise" | "read";
  type WorkspaceTab = "draft" | "outline" | "alignment" | "cast";

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
  let appRoute = $state<AppRoute>("welcome");
  let writingMode = $state<WritingMode>("dev-bridge");
  let loadState = $state<{ title: string; detail?: string } | null>({
    title: "Starting Inscriva",
    detail: "Connecting…",
  });
  let workspaceReady = $state(false);
  let awaitingPresentation = $state(false);
  let restoreFallbackTimer: ReturnType<typeof setTimeout> | undefined;
  let navView = $state<NavigationView>(loadNavigationView());
  let workspaceTab = $state<WorkspaceTab>("draft");
  let activeChapterKey = $state<string | undefined>();
  let bookIndex = $state<BookIndex | null>(null);
  let selectedCharacter = $state<CastCharacter | null>(null);
  let chapterMap = $state<ChapterMapOverrides>({});
  let goalChecks = $state<GoalChecksByChapter>({});
  let alignmentReport = $state<AlignmentReport | null>(null);
  let alignmentBusy = $state(false);
  let dismissedRecIds = $state<string[]>([]);
  let recommendationSettings = $state<RecommendationSettings>(
    loadRecommendationSettings(),
  );
  let expandOutlineEntry = $state<MasterChapterEntry | null>(null);
  let sceneLedgerBusy = $state(false);
  let reconcileMasterBusy = $state(false);
  let shareMode = $state(
    typeof window !== "undefined" ? isShareMode(window.location.search) : false,
  );
  let sidebarOpen = $state(false);
  let styleGuideMarkdown = $state("");
  let styleGuidePath = $state<string | undefined>();
  let appearancesExportBusy = $state(false);
  let outlineContentsCache = $state<Record<string, string>>({});
  let draftContentsCache = $state<Record<string, string>>({});
  const sessionTracker = createWritingSessionTracker();
  let sessionTickTimer: ReturnType<typeof setInterval> | undefined;

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
    chapterPairs.find(
      (p) =>
        p.key === activeChapterKey ||
        p.draft === activePath ||
        p.outline === activePath,
    ),
  );
  const chapterTitle = $derived(
    activePair?.key
      ? bookIndex?.chapters.find((c) => c.key === activePair.key)?.title ??
          activePair.title ??
          activePair.key
      : activePath?.split("/").pop()?.replace(/\.md$/, "") ?? "Chapter",
  );
  const castIndex = $derived(castIndexFromBookIndex(bookIndex));
  const chapterCast = $derived(
    activePair?.key && castIndex
      ? castIndex.charactersInChapter(activePair.key)
      : [],
  );
  const sceneSuggestions = $derived(
    activePair?.draft && activePath === activePair.draft
      ? extractDraftSceneHeadings(editorContent)
      : activePair?.draft
        ? extractDraftSceneHeadings(draftContentsCache[activePair.draft] ?? "")
        : [],
  );
  const wordTarget = $derived(parseWordTarget(focus.wordTarget));
  const targetLabel = $derived(
    wordTarget
      ? wordTarget.min === wordTarget.max
        ? String(wordTarget.max)
        : `${wordTarget.min}–${wordTarget.max}`
      : undefined,
  );
  const draftWordCount = $derived(
    activePair?.draft && activePath === activePair.draft
      ? countWords(editorContent)
      : activePair?.draft
        ? countWords(draftContentsCache[activePair.draft] ?? "")
        : 0,
  );
  const paragraphNotes = $derived(
    activeAnchorId
      ? allNotes.filter((n) => n.anchorId === activeAnchorId)
      : [],
  );
  const showNotesGutter = $derived(mode === "revise" && activePair?.draft === activePath);
  const unlinkedPlants = $derived(
    showNotesGutter || workspaceTab === "alignment"
      ? findUnlinkedPlants(editorContent, outlineContent)
      : [],
  );
  const effectiveMode = $derived(shareMode ? "read" : mode);
  const showStyleGuidePanel = $derived(
    showNotesGutter && activePair?.draft === activePath && currentRevisionPass === "tone",
  );
  const styleGuideViolations = $derived.by(() => {
    if (!styleGuideMarkdown || activePath !== activePair?.draft) return [];
    return checkStyleGuideViolations(
      editorContent,
      parseStyleGuideRules(styleGuideMarkdown),
    );
  });

  const recommendations = $derived.by((): Recommendation[] => {
    if (!activePair?.key) return [];
    const meta = bookIndex?.chapters.find((c) => c.key === activePair.key);
    const summary =
      alignmentReport?.chapterKey === activePair.key
        ? alignmentSummaryFromReport(alignmentReport)
        : meta?.alignmentSummary;
    return filterRecommendations(
      evaluateRecommendations({
        chapterKey: activePair.key,
        draftWords: draftWordCount,
        wordTarget,
        unlinkedPlants,
        alignmentSummary: summary,
        outlineStatus: focus.status,
      }).filter((r) => !dismissedRecIds.includes(`${activePair.key}:${r.id}`)),
      recommendationSettings,
    );
  });

  const goalCheckState = $derived.by(() => {
    const key = activePair?.key;
    if (!key || !alignmentReport) return {};
    const out: Record<string, boolean> = {};
    for (const m of alignmentReport.mustInclude) {
      out[m.item] = isGoalChecked(goalChecks, key, m.item, m.status === "hit");
    }
    return out;
  });

  function setNavView(view: NavigationView) {
    navView = view;
    saveNavigationView(view);
  }

  async function endWritingSession() {
    const open = sessionTracker.state;
    if (!bridge || isDemoBook || !open) return;
    sessionTracker.tick();
    const ended = sessionTracker.end();
    if (!ended) return;
    await appendClosedWritingSession(
      bridge,
      {
        chapterKey: ended.chapterKey,
        draftPath: ended.draftPath,
        wordsAtStart: ended.wordsAtStart,
        targetWords: ended.targetWords,
        startedAt: new Date(ended.startedAt).toISOString(),
      },
      {
        wordsAtEnd: ended.wordsAtEnd,
        activeSeconds: ended.activeSeconds,
      },
    );
  }

  function startWritingSession() {
    const pair = activePair;
    if (!pair?.draft || !pair.key || activePath !== pair.draft) return;
    sessionTracker.start({
      chapterKey: pair.key,
      draftPath: pair.draft,
      wordsAtStart: countWords(editorContent),
      targetWords: wordTarget?.max,
    });
  }

  async function rebuildWorkspaceIndex(
    alignmentByChapter?: Record<string, AlignmentReport>,
  ) {
    if (!bridge) return;
    if (isDemoBook) {
      const characterFiles = new Map<string, string>();
      for (const path of filePaths) {
        if (path.startsWith("00 Canon/") && path.endsWith(".md")) {
          characterFiles.set(path, await bridge.readFile(path));
        }
      }
      const cast = buildCastIndex({
        characterFiles,
        pairs: chapterPairs,
        draftContents: draftContentsCache,
      });
      bookIndex = buildBookIndex({
        pairs: chapterPairs,
        draftContents: draftContentsCache,
        outlineContents: outlineContentsCache,
        alignmentByChapter,
        characters: cast.characters,
      });
      return;
    }
    bookIndex = await refreshBookIndex(bridge, {
      pairs: chapterPairs,
      draftContents: draftContentsCache,
      outlineContents: outlineContentsCache,
      alignmentByChapter,
    });
  }

  async function refreshChapterListing() {
    if (!bridge) return;
    filePaths = await bridge.listFiles();
    fileTree = buildBookTree(filePaths);
    if (isDemoBook) {
      chapterPairs = pairChapters(filePaths);
      const loaded = await loadPairsWithContents(bridge, filePaths, {});
      outlineContentsCache = loaded.outlineContents;
      draftContentsCache = loaded.draftContents;
      await rebuildWorkspaceIndex();
      await refreshStyleGuide();
      return;
    }
    chapterMap = await loadChapterMap(bridge);
    const loaded = await loadPairsWithContents(bridge, filePaths, chapterMap);
    chapterPairs = loaded.pairs;
    outlineContentsCache = loaded.outlineContents;
    draftContentsCache = loaded.draftContents;
    await rebuildWorkspaceIndex();
    await refreshStyleGuide();
  }

  async function refreshStyleGuide() {
    if (!bridge) return;
    const path = findStyleGuidePath(filePaths);
    styleGuidePath = path;
    if (!path) {
      styleGuideMarkdown = "";
      return;
    }
    try {
      styleGuideMarkdown = await bridge.readFile(path);
    } catch {
      styleGuideMarkdown = "";
    }
  }

  async function exportCharacterAppearances() {
    if (!bridge || shareMode || isDemoBook || !castIndex) return;
    appearancesExportBusy = true;
    try {
      const generatedAt = new Date().toISOString();
      for (const character of castIndex.characters) {
        const path = characterAppearancesPath(character.name);
        const content = formatCharacterAppearancesMarkdown(character, generatedAt);
        await bridge.writeFile(path, content);
      }
      await refreshChapterListing();
      gitMessage = `Exported ${castIndex.characters.length} appearance file${castIndex.characters.length === 1 ? "" : "s"}`;
    } catch (e) {
      gitMessage =
        e instanceof Error ? e.message : "Could not export character appearances";
    } finally {
      appearancesExportBusy = false;
    }
  }

  function jumpToDraftOffset(offset: number) {
    if (activePath !== activePair?.draft) return;
    editorCaret = { from: offset, to: offset };
    restoreViewState = {
      caret: editorCaret,
      scrollTop: latestViewState?.scrollTop ?? 0,
    };
  }

  function openStyleGuide() {
    if (styleGuidePath) void openFile(styleGuidePath);
  }

  function copyShareLink() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("share", "1");
    void navigator.clipboard.writeText(url.toString());
    gitMessage = "Read-only share link copied";
  }

  async function selectChapter(key: string) {
    await endWritingSession();
    activeChapterKey = key;
    workspaceTab = "draft";
    const pair = chapterPairs.find((p) => p.key === key);
    if (pair?.draft) {
      await openFile(pair.draft);
    } else if (pair?.outline) {
      await openFile(pair.outline);
    }
    if (bridge && !isDemoBook) {
      alignmentReport = await loadAlignmentReport(bridge, key);
    }
    selectedCharacter = null;
    startWritingSession();
  }

  async function setWorkspaceTab(tab: WorkspaceTab) {
    workspaceTab = tab;
    const pair = activePair;
    if (!pair) return;
    if (tab === "draft" && pair.draft) await openFile(pair.draft);
    else if (tab === "outline" && pair.outline) await openFile(pair.outline);
    else if (tab === "cast") selectedCharacter = null;
  }

  function selectCharacter(character: CastCharacter) {
    selectedCharacter = character;
  }

  function openCharacterSheet(name: string) {
    const character = castIndex?.lookup(name);
    if (!character) return;
    selectedCharacter = character;
    if (navView !== "chapter") setNavView("chapter");
    if (activePair && workspaceTab !== "cast" && workspaceTab !== "draft") {
      workspaceTab = "cast";
    }
  }

  async function jumpToCharacterMention(draftPath: string, offset: number) {
    const text =
      draftPath === activePath
        ? editorContent
        : (draftContentsCache[draftPath] ?? "");
    const line = text ? offsetToLine(text, offset) : 1;
    workspaceTab = "draft";
    await openFile(draftPath, { line });
  }

  function openCharacterBible(path: string) {
    void openFile(path);
  }

  function summariseCharacterArc() {
    if (!selectedCharacter) return;
    assistTaskId = "summarise-character-arc";
    showAssist = true;
  }

  function characterAssistContext(): string {
    if (!selectedCharacter) return "";
    const mentionLines = selectedCharacter.mentions
      .slice(0, 16)
      .map((m) => `- ${m.chapterKey}: …${m.snippet}…`);
    return [
      `Character: ${selectedCharacter.name}`,
      selectedCharacter.aliases.length
        ? `Aliases: ${selectedCharacter.aliases.join(", ")}`
        : "",
      `Bible excerpt: ${selectedCharacter.bibleExcerpt}`,
      "Mention snippets:",
      ...mentionLines,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function runAlignmentRefresh() {
    if (!bridge || !activePair?.key || !activePair.outline || !activePair.draft) {
      return;
    }
    alignmentBusy = true;
    try {
      const outlineMd =
        outlineContentsCache[activePair.outline] ??
        (await bridge.readFile(activePair.outline));
      const draftMd =
        activePath === activePair.draft
          ? editorContent
          : (draftContentsCache[activePair.draft] ??
            (await bridge.readFile(activePair.draft)));
      const report = buildAlignmentReport({
        chapterKey: activePair.key,
        outlineMarkdown: outlineMd,
        draftMarkdown: draftMd,
      });
      alignmentReport = report;
      if (!isDemoBook) {
        await persistAlignmentReport(bridge, report);
        draftContentsCache[activePair.draft] = draftMd;
        await rebuildWorkspaceIndex({ [activePair.key]: report });
      }
    } finally {
      alignmentBusy = false;
    }
  }

  function handleGoalToggle(item: string, checked: boolean) {
    const key = activePair?.key;
    if (!key) return;
    goalChecks = toggleGoalCheck(goalChecks, key, item, checked);
    if (bridge && !isDemoBook) void saveGoalChecks(bridge, goalChecks);
  }

  function dismissRecommendation(id: string) {
    const key = activePair?.key;
    if (!key) return;
    dismissedRecIds = [...dismissedRecIds, `${key}:${id}`];
  }

  function jumpToScene(label: string) {
    const idx = editorContent.indexOf(`## ${label}`);
    if (idx >= 0) jumpToDraftOffset(idx);
  }

  async function handleRevisionAssist(taskId: LlmTaskId) {
    if (currentRevisionPass === "structure") {
      await runAlignmentRefresh();
      workspaceTab = "alignment";
      assistTaskId = "review-chapter-goals";
    } else {
      assistTaskId = taskId;
    }
    showAssist = true;
  }

  async function applyRefreshOutlineToChapter(text: string) {
    const pair = activePair;
    if (!bridge || !pair?.outline || isDemoBook) return;
    const ok = window.confirm(
      "Replace the chapter outline with this Assist output? Review the proposal first.",
    );
    if (!ok) return;
    try {
      await bridge.writeFile(pair.outline, text);
      outlineContentsCache = { ...outlineContentsCache, [pair.outline]: text };
      if (activePath === pair.outline) outlineContent = text;
      workspaceTab = "outline";
      await openFile(pair.outline);
      showAssist = false;
      gitMessage = `Updated chapter outline for ${pair.key} from draft`;
      await refreshChapterListing();
    } catch (e) {
      gitMessage =
        e instanceof Error ? e.message : "Could not save chapter outline";
    }
  }

  function handleAssistApply(text: string) {
    if (shareMode) return;
    if (expandOutlineEntry) {
      void applyExpandOutlineToChapter(text);
      return;
    }
    if (assistTaskId === "refresh-outline-from-draft") {
      void applyRefreshOutlineToChapter(text);
      return;
    }
    applyAssistText(text);
  }

  async function handleChapterMapSave(map: ChapterMapOverrides) {
    if (!bridge || isDemoBook) return;
    chapterMap = map;
    await saveChapterMap(bridge, map);
    await refreshChapterListing();
    gitMessage = "Chapter pairing saved";
  }

  function insertPlantInDraft(plantId: string) {
    if (!activePair?.draft || activePath !== activePair.draft) return;
    editorContent = insertPlantReference(editorContent, editorCaret.from, plantId);
    reconcileCurrent();
    if (bridge) void persistFile(activePath, editorContent);
  }

  async function appendSceneLedger() {
    if (!bridge || !activePair?.key || isDemoBook || sceneSuggestions.length === 0) {
      return;
    }
    sceneLedgerBusy = true;
    try {
      let existing = "";
      try {
        existing = await bridge.readFile(SCENE_LEDGER_PATH);
      } catch {
        /* new file */
      }
      const next = appendSceneLedgerEntries(
        existing,
        activePair.key,
        sceneSuggestions,
      );
      await bridge.writeFile(SCENE_LEDGER_PATH, next);
      gitMessage = `Appended ${sceneSuggestions.length} scene(s) to Scene Ledger`;
      await refreshBook();
    } catch (e) {
      gitMessage = e instanceof Error ? e.message : "Could not update Scene Ledger";
    } finally {
      sceneLedgerBusy = false;
    }
  }

  async function reconcileMasterOutline() {
    if (!bridge || !masterOutlinePath || isDemoBook) return;
    reconcileMasterBusy = true;
    try {
      const statuses: Record<string, string | undefined> = {};
      for (const chapter of bookIndex?.chapters ?? []) {
        statuses[chapter.key] = chapter.outlineStatus;
      }
      const current = await bridge.readFile(masterOutlinePath);
      const next = reconcileMasterOutlineStatuses(current, statuses);
      await bridge.writeFile(masterOutlinePath, next);
      if (activePath === masterOutlinePath) editorContent = next;
      gitMessage = "Synced chapter statuses into Master Outline";
      await refreshBook();
    } catch (e) {
      gitMessage =
        e instanceof Error ? e.message : "Could not reconcile Master Outline";
    } finally {
      reconcileMasterBusy = false;
    }
  }

  function handleRecommendationAssist(taskId: LlmTaskId) {
    assistTaskId = taskId;
    showAssist = true;
  }

  async function handleChapterReviewComplete(output: string) {
    const pair = activePair;
    if (!bridge || !pair?.key || isDemoBook) return;
    try {
      const { exportPath, parsedStatus } = await persistAiChapterReview(bridge, {
        chapterKey: pair.key,
        output,
        outlinePath: pair.outline,
      });
      gitMessage = `Saved AI review to ${exportPath}`;

      if (parsedStatus && pair.outline) {
        const update = confirm(
          `Review reports status “${parsedStatus}”. Update the outline ## Status section to match?`,
        );
        if (update) {
          await persistAiChapterReview(bridge, {
            chapterKey: pair.key,
            output,
            outlinePath: pair.outline,
            updateOutlineStatus: true,
          });
          const refreshed = await bridge.readFile(pair.outline);
          outlineContentsCache = {
            ...outlineContentsCache,
            [pair.outline]: refreshed,
          };
          if (activePath === pair.outline) {
            outlineContent = refreshed;
          }
          gitMessage = `Saved review and set outline status to “${parsedStatus}”`;
          await rebuildWorkspaceIndex();
        }
      }
    } catch (e) {
      gitMessage = e instanceof Error ? e.message : "Could not save AI review";
    }
  }

  function handleRevisionChecked(passId: RevisionPassId, checked: boolean) {
    revisionChecked = { ...revisionChecked, [passId]: checked };
  }
  const selectionText = $derived(editorSelection?.text);
  const isDemoBook = $derived(bookPath === MOCK_BOOK_PATH);
  const hostLabel = $derived(capabilities.platform ?? host);
  const masterOutlinePath = $derived(findMasterOutlinePath(filePaths));

  async function openBookOutline() {
    if (masterOutlinePath) await openFile(masterOutlinePath);
  }

  function handleExpandFromMaster(entry: MasterChapterEntry) {
    expandOutlineEntry = entry;
    assistTaskId = "expand-outline";
    showAssist = true;
  }

  async function applyExpandOutlineToChapter(text: string) {
    const entry = expandOutlineEntry;
    if (!bridge || !entry || isDemoBook) return;
    const pair = chapterPairs.find((p) => p.key === entry.key);
    const outlinePath = pair?.outline ?? defaultChapterOutlinePath(entry);
    let existing: string | undefined;
    if (pair?.outline) {
      try {
        existing = await bridge.readFile(pair.outline);
      } catch {
        existing = outlineContentsCache[pair.outline];
      }
    }
    const next = applyExpandedChapterOutline(existing, text, entry);
    try {
      await bridge.writeFile(outlinePath, next);
      outlineContentsCache = { ...outlineContentsCache, [outlinePath]: next };
      await refreshChapterListing();
      activeChapterKey = entry.key;
      workspaceTab = "outline";
      await openFile(outlinePath);
      expandOutlineEntry = null;
      showAssist = false;
      gitMessage = `Updated chapter outline for ${entry.key}`;
    } catch (e) {
      gitMessage =
        e instanceof Error ? e.message : "Could not save chapter outline";
    }
  }

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
  const assistWritingContext = $derived.by(() => {
    if (expandOutlineEntry) {
      const pair = chapterPairs.find((p) => p.key === expandOutlineEntry.key);
      const existing = pair?.outline
        ? outlineContentsCache[pair.outline]
        : undefined;
      const base = assembleWritingContext({
        editorContent,
        outlineContent: existing ?? "",
        canonIndex,
        offset: editorCaret.from,
        workingText: editorSelection?.text,
      });
      return {
        chapterFocus: formatExpandOutlineContext({
          entry: expandOutlineEntry,
          existingChapterOutline: existing,
        }),
        relevantCanon: base.relevantCanon,
      };
    }
    return assembleWritingContext({
      editorContent,
      outlineContent,
      canonIndex,
      offset: editorSelection?.to ?? editorCaret.to,
      workingText: editorSelection?.text,
    });
  });

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

  function goToDownload() {
    navigateAppRoute("download");
    appRoute = "download";
  }

  function goToWelcome() {
    navigateAppRoute("welcome");
    appRoute = "welcome";
  }

  onMount(() => {
    urlEditorLocation = parseEditorLocation(location.search);
    shareMode = isShareMode(location.search);
    appRoute = readAppRoute();
    if (shareMode) mode = "read";

    const onPopState = () => {
      appRoute = readAppRoute();
    };
    window.addEventListener("popstate", onPopState);

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
      writingMode = await detectWritingMode();
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
      window.removeEventListener("popstate", onPopState);
      window.removeEventListener("beforeunload", onBeforeUnload);
      clearTimeout(urlLineTimer);
      clearTimeout(restoreFallbackTimer);
      clearInterval(sessionTickTimer);
      void endWritingSession();
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
        void endWritingSession();
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
    canonIndex = buildCanonIndex(mock.files);
    const demoLoaded = await loadPairsWithContents(bridge, filePaths, {});
    outlineContentsCache = demoLoaded.outlineContents;
    draftContentsCache = demoLoaded.draftContents;
    chapterPairs = demoLoaded.pairs;
    activePath = MOCK_CHAPTER_PATH;
    editorContent = mock.files.get(MOCK_CHAPTER_PATH) ?? "";
    outlineContent = mock.files.get(MOCK_OUTLINE_PATH) ?? "";
    contentBeforeEdit = editorContent;
    activeChapterKey = "Ch01";
    await rebuildWorkspaceIndex();
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
    await refreshChapterListing();
    if (!isDemoBook && bridge) {
      goalChecks = await loadGoalChecks(bridge);
    }
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
      const pair = chapterPairs.find(
        (p) => p.draft === target || p.outline === target,
      );
      if (pair) activeChapterKey = pair.key;
      await openFile(target, { line });
      finishWorkspaceOpen(target);
      startWritingSession();
    } else {
      completeWorkspaceOpen();
    }
    startAutosave();
    startSessionClock();
    void loadBookSupplementInBackground();
  }

  async function refreshBook() {
    await refreshChapterListing();
    await Promise.all([rebuildCanonIndex(), loadNotes()]);
  }

  function startSessionClock() {
    clearInterval(sessionTickTimer);
    sessionTickTimer = setInterval(() => sessionTracker.tick(), 1000);
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
      if (outlinePath) outlineContentsCache[outlinePath] = outlineText;
    } else if (path.includes("Chapter Outlines/")) {
      outlineContent = editorContent;
      outlineContentsCache[path] = editorContent;
    }

    if (pair) {
      activeChapterKey = pair.key;
      if (pair.draft) draftContentsCache[pair.draft] =
        pair.draft === path ? editorContent : draftContentsCache[pair.draft] ?? text;
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

    const pair = activePair;
    if (pair?.draft && pair.draft === activePath) {
      sessionTracker.onEdit(countWords(value));
      draftContentsCache[pair.draft] = value;
    }

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

  async function handleFileDelete(filePath: string) {
    if (!bridge || !confirmDeleteFile(filePath)) return;

    cancelPendingFileSave(saveTimer);
    saveTimer = undefined;

    const wasActive = activePath === filePath;
    const fallback = filePaths.find(
      (p) => p !== filePath && p.endsWith(".md"),
    );

    try {
      await bridge.deleteFile(filePath);
      if (bookPath && bookPath !== MOCK_BOOK_PATH) {
        deleteFileInSession(bookPath, filePath);
      }
      await refreshBook();
      if (wasActive) {
        if (fallback) {
          await openFile(fallback);
        } else {
          activePath = undefined;
          editorContent = "";
          outlineContent = "";
          activeChapterKey = undefined;
          syncEditorUrl(null);
        }
      }
      gitStatus = await bridge.gitStatus();
      gitMessage = "";
    } catch (e) {
      gitMessage = e instanceof Error ? e.message : "Delete failed";
    }
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
    if (!bridge || shareMode) return;
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

    if (path.includes("01 Outlines/")) {
      outlineContentsCache[path] = content;
      void rebuildWorkspaceIndex();
    } else if (path.includes("02 Drafts/")) {
      draftContentsCache[path] = content;
      const pair = chapterPairs.find((p) => p.draft === path);
      if (pair) void rebuildWorkspaceIndex();
    }
  }

  async function addNote(text: string) {
    if (!bridge || !activeAnchorId || shareMode) return;
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
    if (shareMode) mode = "read";
  });

  $effect(() => {
    if (!bookPath || !bridge || !workspaceReady || shareMode || isDemoBook) return;

    const unbind = bindSyncOnResume(async () => {
      if (capabilities.gitPull) {
        try {
          await bridge!.gitPull();
          gitMessage = "";
        } catch {
          /* offline or no remote */
        }
      }
      await refreshBook();
      gitStatus = await bridge!.gitStatus();
    });

    return unbind;
  });

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
{:else if !bookPath && appRoute === "download"}
  <DownloadPage {writingMode} onBack={goToWelcome} onDemo={openDemo} />
{:else if !bookPath}
  <WelcomeScreen
    {bridge}
    {capabilities}
    {recents}
    {writingMode}
    bind:tab={welcomeTab}
    onOpen={handleBookOpened}
    onDemo={openDemo}
    onDownload={goToDownload}
  />
{:else}
  <div class="app" data-host={host}>
    <header class="topbar">
      <div class="brand">
        <button
          type="button"
          class="mobile-nav-toggle"
          aria-label={sidebarOpen ? "Hide navigation" : "Show navigation"}
          aria-expanded={sidebarOpen}
          onclick={() => (sidebarOpen = !sidebarOpen)}
        >☰</button>
        <img class="logo" src="/inscriva.svg" width="129" height="48" alt="Inscriva" />
        <span class="book-title">{bookTitle}</span>
      </div>

      {#if shareMode}
        <p class="share-banner" role="status">Read-only share — editing and saves are disabled</p>
      {/if}

      <nav class="modes" aria-label="Editor mode">
        {#each ["draft", "revise", "read"] as m}
          <button
            type="button"
            class:active={effectiveMode === m}
            disabled={shareMode}
            onclick={() => (mode = m as EditorMode)}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        {/each}
      </nav>

      <div class="status">
        <span class="host-badge">{hostLabel}</span>
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
        <button type="button" class="link" onclick={() => (showAssist = !showAssist)} disabled={shareMode}>
          {showAssist ? "Hide assist" : "Assist"}
        </button>
        {#if !shareMode}
          <button type="button" class="link" onclick={copyShareLink} title="Copy read-only share link">
            Share
          </button>
        {/if}
        <button type="button" class="link" onclick={() => (showSettings = true)}>Settings</button>
        <button
          type="button"
          class="link"
          onclick={() => {
            void endWritingSession();
            bookPath = null;
            syncEditorUrl(null);
          }}
        >Close book</button>
      </div>
    </header>

    <div class="workspace" class:revise={showNotesGutter} class:sidebar-open={sidebarOpen}>
      {#if loadState}
        <AppLoadOverlay title={loadState.title} detail={loadState.detail} />
      {/if}
      <aside class="sidebar">
        <div class="nav-switch" role="tablist" aria-label="Navigation">
          <button
            type="button"
            role="tab"
            aria-selected={navView === "chapter"}
            class:active={navView === "chapter"}
            onclick={() => setNavView("chapter")}
          >Chapters</button>
          <button
            type="button"
            role="tab"
            aria-selected={navView === "board"}
            class:active={navView === "board"}
            onclick={() => setNavView("board")}
          >Board</button>
          <button
            type="button"
            role="tab"
            aria-selected={navView === "files"}
            class:active={navView === "files"}
            onclick={() => setNavView("files")}
          >Files</button>
        </div>
        {#if navView === "board" && chapterPairs.length}
          <ChapterBoard
            pairs={chapterPairs}
            indexChapters={bookIndex?.chapters}
            activeKey={activeChapterKey ?? activePair?.key}
            onSelect={selectChapter}
          />
        {:else if navView === "chapter" && chapterPairs.length}
          <ChapterRail
            pairs={chapterPairs}
            indexChapters={bookIndex?.chapters}
            activeKey={activeChapterKey ?? activePair?.key}
            masterOutlinePath={masterOutlinePath}
            onOpenBookOutline={openBookOutline}
            onSelect={selectChapter}
          />
          {#if activePair && !isDemoBook}
            <ChapterMapForm
              pair={activePair}
              {filePaths}
              overrides={chapterMap}
              onSave={handleChapterMapSave}
            />
          {/if}
        {:else if fileTree}
          <FileTree
            tree={fileTree}
            {activePath}
            defaultCreateDir={defaultCreateDir}
            readOnly={shareMode}
            onSelect={(path) => {
              sidebarOpen = false;
              openFile(path);
            }}
            onRename={handleFileRename}
            onDelete={handleFileDelete}
            onCreate={handleCreateFile}
            onMove={handleFileMove}
          />
        {/if}
      </aside>

      <main class="editor-pane" class:preparing={!workspaceReady}>
        {#if activePair && navView === "chapter"}
          <nav class="workspace-tabs" aria-label="Chapter workspace">
            {#each [
              { id: "draft", label: "Draft" },
              { id: "outline", label: "Outline" },
              { id: "alignment", label: "Alignment" },
              { id: "cast", label: "Cast" },
            ] as tab (tab.id)}
              <button
                type="button"
                class:active={workspaceTab === tab.id}
                onclick={() => setWorkspaceTab(tab.id as WorkspaceTab)}
              >{tab.label}</button>
            {/each}
          </nav>
        {/if}
        {#if sessionTracker.state && workspaceTab === "draft" && activePair?.draft === activePath}
          <WritingSessionStrip
            activeSeconds={sessionTracker.state.activeSeconds}
            paused={sessionTracker.state.paused}
            wordsAdded={sessionTracker.wordsAdded()}
            draftWords={draftWordCount}
            {targetLabel}
          />
        {/if}
        {#if activePath && masterOutlinePath && activePath === masterOutlinePath}
          <MasterOutlineBar
            masterMarkdown={editorContent}
            caretOffset={editorCaret.from}
            onExpand={handleExpandFromMaster}
            onReconcile={reconcileMasterOutline}
            reconcileBusy={reconcileMasterBusy}
          />
        {/if}
        {#if workspaceTab === "draft" && focus.sceneCards.length}
          <SceneNavigator
            scenes={focus.sceneCards}
            matchedLabels={alignmentReport?.scenes.matched ?? []}
            onJump={jumpToScene}
          />
        {/if}
        {#if workspaceTab === "draft" && sceneSuggestions.length && activePair?.draft === activePath}
          <SceneLedgerPanel
            chapterKey={activePair.key}
            suggestions={sceneSuggestions}
            busy={sceneLedgerBusy}
            onAppend={appendSceneLedger}
            onOpenLedger={() => openFile(SCENE_LEDGER_PATH)}
          />
        {/if}
        {#if activePath && workspaceReady}
          <header class="editor-file-header">
            {#if shareMode}
              <span class="file-path">{activePath}</span>
            {:else}
              <FileRenameField
                path={activePath}
                onSave={(base) => handleFileRename(activePath!, base)}
                onCancel={() => {}}
              />
            {/if}
          </header>
        {/if}
        {#if showNotesGutter && unlinkedPlants.length}
          <div class="plant-banner" role="status">
            Unlinked plants in outline: {unlinkedPlants.join(", ")} — see Revision panel
          </div>
        {/if}
        {#if workspaceTab === "alignment" && activePair}
          <AlignmentPanel
            report={alignmentReport}
            outlineStatus={focus.status}
            {recommendations}
            busy={alignmentBusy}
            onRefresh={runAlignmentRefresh}
            onDismissRecommendation={dismissRecommendation}
            onRunAssist={handleRecommendationAssist}
          />
        {:else if workspaceTab === "cast" && activePair}
          <CastPanel
            characters={chapterCast}
            chapterKey={activePair.key}
            activeCharacterId={selectedCharacter?.id}
            exportBusy={appearancesExportBusy}
            showExport={!shareMode && !isDemoBook}
            onExportAppearances={exportCharacterAppearances}
            onSelect={selectCharacter}
          />
        {:else if activePath}
          <Editor
            content={editorContent}
            mode={effectiveMode}
            {canonIndex}
            castIndex={castIndex}
            onCharacterClick={openCharacterSheet}
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
        {#if selectedCharacter}
          <CharacterSheet
            character={selectedCharacter}
            chapterKey={activePair?.key}
            onJumpToMention={jumpToCharacterMention}
            onOpenBible={openCharacterBible}
            onSummariseArc={summariseCharacterArc}
            onclose={() => (selectedCharacter = null)}
          />
        {/if}
        {#if showAssist && bookPath}
          <AssistPanel
            {bridge}
            bookId={bookPath}
            chapterKey={expandOutlineEntry?.key ?? activePair?.key}
            taskId={assistTaskId}
            {activePath}
            {selectionText}
            {draftExcerpt}
            chapterFocus={
              assistTaskId === "summarise-character-arc"
                ? characterAssistContext()
                : assistWritingContext.chapterFocus
            }
            relevantCanon={assistWritingContext.relevantCanon}
            expandOutlineMode={Boolean(expandOutlineEntry)}
            refreshOutlineMode={assistTaskId === "refresh-outline-from-draft"}
            onapply={handleAssistApply}
            onChapterReviewComplete={handleChapterReviewComplete}
            onclose={() => {
              showAssist = false;
              expandOutlineEntry = null;
            }}
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
            onInsertPlant={shareMode ? undefined : insertPlantInDraft}
          />
        {/if}
        {#if showStyleGuidePanel}
          <StyleGuidePanel
            violations={styleGuideViolations}
            styleGuidePath={styleGuidePath}
            onOpenStyleGuide={openStyleGuide}
            onRunVoiceAssist={shareMode ? undefined : () => handleRevisionAssist("review-voice")}
            onJump={jumpToDraftOffset}
          />
        {/if}
        {#if workspaceTab === "alignment" && alignmentReport}
          <GoalChecklist
            items={alignmentReport.mustInclude}
            checked={goalCheckState}
            onToggle={handleGoalToggle}
          />
        {/if}
        <ChapterPanel {focus} {chapterTitle} showBanner={effectiveMode === "draft"} />
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
          mode={effectiveMode}
          generate={writeWithAiGenerate}
          onapply={applyAiWriting}
          onaddnote={persistNote}
        />
      </aside>
    </div>

    <SettingsModal
      {bridge}
      open={showSettings}
      bind:recommendationSettings
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
    color: var(--text-on-topbar);
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
    color: var(--text-on-topbar-muted);
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
    color: var(--text-on-topbar-subtle);
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
    color: var(--text-on-topbar-muted);
  }

  .host-badge {
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.2);
    text-transform: uppercase;
    font-size: 0.65rem;
    color: var(--text-on-topbar);
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

  .nav-switch {
    display: flex;
    gap: 0.25rem;
    padding: 0.5rem 0.5rem 0;
  }

  .nav-switch button {
    flex: 1;
    border: none;
    background: rgba(0, 0, 0, 0.2);
    color: var(--text-on-leather-muted);
    padding: 0.35rem;
    border-radius: 4px;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .nav-switch button.active {
    background: linear-gradient(180deg, #faf6ee 0%, #e8dfd4 100%);
    color: var(--text-on-leather-chip);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
  }

  .workspace-tabs {
    display: flex;
    gap: 0.25rem;
    padding: 0.35rem 1rem 0;
    border-bottom: 1px solid var(--border);
    background: var(--bg-elevated);
  }

  .workspace-tabs button {
    border: none;
    background: transparent;
    padding: 0.35rem 0.75rem;
    border-radius: 6px 6px 0 0;
    cursor: pointer;
    font-size: 0.8rem;
    color: var(--text-muted);
  }

  .workspace-tabs button.active {
    background: var(--surface-tab-active);
    border: 1px solid var(--border);
    border-bottom-color: var(--surface-tab-active);
    margin-bottom: -1px;
    font-weight: 600;
    color: var(--text);
  }

  .sidebar {
    color: var(--text-on-leather);
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
    color: var(--text);
    background: var(--bg-elevated);
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

  .editor-file-header :global(.rename-field) {
    --rename-border: var(--border);
    --rename-focus: var(--accent);
    --rename-focus-ring: rgba(139, 105, 20, 0.2);
  }

  .editor-file-header :global(.rename-display) {
    font-family: var(--font-display);
    font-size: 1rem;
    font-weight: 600;
    color: var(--text);
  }

  .editor-file-header :global(.rename-display:hover) {
    background: rgba(139, 105, 20, 0.1);
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
    .mobile-nav-toggle {
      display: inline-flex;
    }

    .workspace {
      grid-template-columns: 1fr;
    }

    .workspace.revise {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr auto auto;
    }

    .sidebar {
      display: none;
      position: fixed;
      z-index: 40;
      top: 3.25rem;
      left: 0;
      bottom: 0;
      width: min(var(--sidebar-width), 88vw);
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.35);
    }

    .workspace.sidebar-open .sidebar {
      display: flex;
    }

    .right-rail {
      border-left: none;
      border-top: 1px solid var(--border);
      max-height: 42vh;
      overflow: auto;
    }

    .right-rail :global(.assist) {
      max-height: 38vh;
    }
  }

  .mobile-nav-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid rgba(255, 255, 255, 0.25);
    border-radius: 6px;
    background: rgba(0, 0, 0, 0.2);
    color: inherit;
    font-size: 1rem;
    cursor: pointer;
  }

  .share-banner {
    margin: 0;
    flex: 1;
    text-align: center;
    font-size: 0.78rem;
    color: #fde68a;
  }

  .file-path {
    font-size: 0.82rem;
    color: var(--text-muted);
    font-family: ui-monospace, monospace;
  }

  .modes button:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
</style>
