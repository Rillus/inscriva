/** Encode a repo-relative file path for a sidecar filename. */
export function anchorSidecarPath(filePath: string): string {
  const safe = filePath.replace(/[/\\]/g, "__");
  return `.inscriva/anchors/${safe}.json`;
}

export const NOTES_PATH = ".inscriva/notes/notes.jsonl";
export const CONFIG_PATH = ".inscriva/config.json";
export const CHAPTER_MAP_PATH = ".inscriva/chapter-map.json";
