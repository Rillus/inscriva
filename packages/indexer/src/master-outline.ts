/** Canonical path for the book-level plot outline (PRD §6). */
export const MASTER_OUTLINE_PATH = "01 Outlines/Master Outline.md";

export function findMasterOutlinePath(paths: string[]): string | undefined {
  if (paths.includes(MASTER_OUTLINE_PATH)) return MASTER_OUTLINE_PATH;
  return paths.find(
    (p) =>
      p.endsWith("/Master Outline.md") ||
      p.endsWith("\\Master Outline.md"),
  );
}
