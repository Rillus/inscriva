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
  extractChapterKey,
  pairChapters,
  type ChapterMapOverrides,
  type ChapterPair,
} from "./chapter-pairing.js";

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
  anchorSidecarPath,
  CHAPTER_MAP_PATH,
  CONFIG_PATH,
  NOTES_PATH,
} from "./sidecar-path.js";

export {
  buildRenamedPath,
  fileBaseName,
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
