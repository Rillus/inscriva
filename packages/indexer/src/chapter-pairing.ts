export interface ChapterPair {
  key: string;
  outline?: string;
  draft?: string;
}

export interface ChapterMapOverrides {
  [chapterKey: string]: {
    outline?: string;
    draft?: string;
  };
}

const CHAPTER_KEY_RE = /\b(Ch\d+)\b/i;

export function extractChapterKey(path: string): string | null {
  const base = path.split("/").pop() ?? path;
  const match = base.match(CHAPTER_KEY_RE);
  return match ? match[1]!.replace(/^ch/i, "Ch") : null;
}

export function pairChapters(
  paths: string[],
  overrides: ChapterMapOverrides = {},
): ChapterPair[] {
  const outlines = new Map<string, string>();
  const drafts = new Map<string, string>();

  for (const path of paths) {
    const key = extractChapterKey(path);
    if (!key) continue;

    if (path.includes("Chapter Outlines/") || path.includes("Chapter Outlines\\")) {
      outlines.set(key, path);
    } else if (path.includes("Drafts/Chapters/") || path.includes("Drafts\\Chapters\\")) {
      drafts.set(key, path);
    }
  }

  const keys = new Set([...outlines.keys(), ...drafts.keys()]);
  return [...keys].sort().map((key) => {
    const override = overrides[key];
    return {
      key,
      outline: override?.outline ?? outlines.get(key),
      draft: override?.draft ?? drafts.get(key),
    };
  });
}
