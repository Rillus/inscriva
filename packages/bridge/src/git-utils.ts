/** Derive a folder name from a Git remote URL. */
export function repoNameFromUrl(url: string): string {
  const trimmed = url.trim().replace(/\.git$/i, "").replace(/\/$/, "");
  const scp = trimmed.match(/^[^@]+@[^:]+:(.+)$/);
  const pathPart = scp ? scp[1]! : trimmed.split("://").pop() ?? trimmed;
  const segment = pathPart.split("/").filter(Boolean).pop();
  return segment ?? "book";
}
