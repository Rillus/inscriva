/** Encode a repo-relative file path for a sidecar filename. */
export function anchorSidecarPath(filePath: string): string {
  const safe = filePath.replace(/[/\\]/g, "__");
  return `.inscriva/anchors/${safe}.json`;
}

export const NOTES_PATH = ".inscriva/notes/notes.jsonl";
export const CONFIG_PATH = ".inscriva/config.json";
export const CHAPTER_MAP_PATH = ".inscriva/chapter-map.json";
export const GOAL_CHECKS_PATH = ".inscriva/goal-checks.json";
export const BOOK_INDEX_PATH = ".inscriva/index.json";
/** Append-only machine log for writing sessions (not shown in file tree by default). */
export const WRITING_SESSIONS_PATH = ".inscriva/writing-sessions.jsonl";
/** Machine-readable alignment cache (rebuilt from checks). */
export const ALIGNMENT_REPORTS_DIR = ".inscriva/reports";
/** Author-facing alignment reports (visible in file tree). */
export const ALIGNMENT_EXPORT_DIR = "03 Revision/Alignment";
/** Author-facing writing discipline log (visible in file tree). */
export const WRITING_LOG_PATH = "03 Revision/Writing log.md";

export function alignmentReportCachePath(chapterKey: string): string {
  return `${ALIGNMENT_REPORTS_DIR}/${chapterKey}-alignment.json`;
}

export function alignmentReportExportPath(chapterKey: string): string {
  return `${ALIGNMENT_EXPORT_DIR}/${chapterKey}.md`;
}
