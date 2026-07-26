export {
  buildSidecar,
  fingerprint,
  normaliseText,
  parseParagraphs,
  previewText,
  reconcileAnchors,
  type AnchorRecord,
  type AnchorSidecar,
  type AnchorStatus,
  type MatchKind,
  type Paragraph,
  type ReconciledAnchor,
  type ReconciledSidecar,
} from "./anchors/index.js";

export {
  buildBookTree,
  type TreeNode,
} from "./book-tree.js";

export {
  buildCanonIndex,
  type CanonEntry,
  type CanonIndex,
} from "./canon-index.js";

export {
  buildAlignmentReport,
  formatAlignmentMarkdown,
  matchSceneHeadings,
  type AlignmentReport,
  type MustIncludeCheck,
} from "./alignment.js";

export {
  alignmentSummaryFromReport,
  buildBookIndex,
  parseBookIndex,
  serialiseBookIndex,
  type BookIndex,
  type BookIndexChapter,
} from "./book-index.js";

export {
  extractTitleFromFilename,
  extractTitleFromOutline,
  isPlaceholderChapterTitle,
  resolveChapterTitle,
} from "./chapter-title.js";

export {
  extractChapterKey,
  extractChapterKeyFromFilename,
  pairChapters,
  resolveDraftChapterKey,
  resolveOutlineChapterKey,
  type ChapterMapOverrides,
  type ChapterPair,
  type PairChaptersInput,
} from "./chapter-pairing.js";

export {
  isGoalChecked,
  parseGoalChecks,
  serialiseGoalChecks,
  toggleGoalCheck,
  type GoalChecksByChapter,
} from "./goal-checks.js";

export {
  parseChapterFocus,
  extractChapterKeyFromOutlineH1,
  normaliseChapterKey,
  type ChapterFocus,
  type SceneCard,
} from "./outline-parse.js";

export {
  evaluateRecommendations,
  type Recommendation,
  type RecommendationContext,
  type RecommendationId,
} from "./recommendations.js";

export {
  appendNote,
  notesForAnchor,
  notesForEditorAnchor,
  parseNotesJsonl,
  serialiseNotes,
  type LineNote,
  type NoteTarget,
  type NoteType,
} from "./notes.js";

export {
  alignmentReportCachePath,
  alignmentReportExportPath,
  ALIGNMENT_EXPORT_DIR,
  ALIGNMENT_REPORTS_DIR,
  anchorSidecarPath,
  BOOK_INDEX_PATH,
  CHAPTER_MAP_PATH,
  CONFIG_PATH,
  GOAL_CHECKS_PATH,
  NOTES_PATH,
  WRITING_LOG_PATH,
  WRITING_SESSIONS_PATH,
} from "./sidecar-path.js";

export { isChapterWorkflowComplete } from "./workflow-status.js";

export {
  findMasterOutlinePath,
  MASTER_OUTLINE_PATH,
} from "./master-outline.js";

export {
  applyExpandedChapterOutline,
  buildChapterOutlineSkeleton,
  CHAPTER_OUTLINE_FORMAT_GUIDE,
  CHAPTER_OUTLINE_SECTIONS,
  defaultChapterOutlinePath,
  MASTER_OUTLINE_FORMAT_GUIDE,
} from "./chapter-outline-template.js";

export {
  findMasterChapterAtOffset,
  formatMasterChapterForContext,
  parseMasterOutline,
  type MasterChapterEntry,
  type MasterOutlineDocument,
} from "./master-outline-parse.js";

export {
  aiReviewExportPath,
  formatAiReviewMarkdown,
  parseAiReviewStatus,
  setOutlineStatus,
} from "./chapter-review.js";

export {
  countWords,
  DEFAULT_WORD_TARGET_BAND,
  draftWordTargetStatus,
  parseWordTarget,
  wordsWithinTargetBand,
  type DraftWordTargetStatus,
  type WordTarget,
  type WordTargetBand,
} from "./word-target.js";

export {
  appendWritingSessionLine,
  closeWritingSession,
  formatWritingLogEntry,
  openWritingSession,
  wordsAddedInSession,
  type WritingSessionClosed,
  type WritingSessionOpen,
} from "./writing-session.js";

export {
  buildMovedPath,
  buildNewFilePath,
  buildRenamedPath,
  defaultNewFileDirectory,
  fileBaseName,
  fileDirectory,
  fileNameFromBase,
  validateFileBaseName,
} from "./file-name.js";

export {
  REVISION_PASSES,
  findUnlinkedPlants,
  parsePlants,
  type RevisionAssistTaskId,
  type RevisionPass,
  type RevisionPassId,
} from "./revision-passes.js";
