/** Outline workflow statuses that mean the author considers the chapter done. */
const COMPLETE_STATUSES = new Set([
  "approved",
  "aligned",
  "complete",
  "completed",
  "done",
  "final",
  "locked",
]);

export function isChapterWorkflowComplete(status?: string): boolean {
  if (!status?.trim()) return false;
  return COMPLETE_STATUSES.has(status.trim().toLowerCase());
}
