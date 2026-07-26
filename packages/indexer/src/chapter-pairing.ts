import { resolveChapterTitle } from "./chapter-title.js";
import { extractChapterKeyFromOutlineH1, normaliseChapterKey } from "./outline-parse.js";

export interface ChapterPair {
  key: string;
  outline?: string;
  draft?: string;
  title?: string;
}

export interface ChapterMapOverrides {
  [chapterKey: string]: {
    outline?: string;
    draft?: string;
  };
}

const CHAPTER_KEY_RE = /\b(Ch\d+)\b/i;
const NUMERIC_PREFIX_RE = /^(\d{1,3})\s*[-–—\s]/;

export function extractChapterKeyFromFilename(path: string): string | null {
  const base = (path.split("/").pop() ?? path).replace(/\.md$/i, "");

  const chMatch = base.match(CHAPTER_KEY_RE);
  if (chMatch) return normaliseChapterKey(chMatch[1]!);

  const numMatch = base.match(NUMERIC_PREFIX_RE);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isFinite(n)) return `Ch${String(n).padStart(2, "0")}`;
  }

  return null;
}

/** @deprecated Use extractChapterKeyFromFilename */
export function extractChapterKey(path: string): string | null {
  return extractChapterKeyFromFilename(path);
}

export function resolveOutlineChapterKey(
  path: string,
  outlineMarkdown?: string,
): string | null {
  return (
    extractChapterKeyFromFilename(path) ??
    (outlineMarkdown ? extractChapterKeyFromOutlineH1(outlineMarkdown) : null) ??
    null
  );
}

export function resolveDraftChapterKey(path: string): string | null {
  return extractChapterKeyFromFilename(path);
}

export interface PairChaptersInput {
  paths: string[];
  overrides?: ChapterMapOverrides;
  /** Outline file contents keyed by path (for H1 `ChNN` pairing). */
  outlineContents?: Record<string, string>;
}

export function pairChapters(
  pathsOrInput: string[] | PairChaptersInput,
  legacyOverrides: ChapterMapOverrides = {},
): ChapterPair[] {
  const input: PairChaptersInput = Array.isArray(pathsOrInput)
    ? { paths: pathsOrInput, overrides: legacyOverrides }
    : pathsOrInput;

  const { paths, overrides = {}, outlineContents = {} } = input;
  const outlines = new Map<string, string>();
  const drafts = new Map<string, string>();
  const draftPaths = new Map<string, string>();

  for (const path of paths) {
    const isOutline =
      path.includes("Chapter Outlines/") || path.includes("Chapter Outlines\\");
    const isDraft =
      path.includes("Drafts/Chapters/") || path.includes("Drafts\\Chapters\\");

    if (isOutline) {
      const key = resolveOutlineChapterKey(path, outlineContents[path]);
      if (!key) continue;
      outlines.set(key, path);
    } else if (isDraft) {
      const key = resolveDraftChapterKey(path);
      if (!key) continue;
      drafts.set(key, path);
      draftPaths.set(key, path);
    }
  }

  const keys = new Set([...outlines.keys(), ...drafts.keys()]);
  return [...keys].sort().map((key) => {
    const override = overrides[key];
    const outlinePath = override?.outline ?? outlines.get(key);
    const draftPath = override?.draft ?? drafts.get(key);
    const title = resolveChapterTitle({
      outlineMarkdown: outlinePath ? outlineContents[outlinePath] : undefined,
      draftPath,
      outlinePath,
    });

    return {
      key,
      title,
      outline: outlinePath,
      draft: draftPath,
    };
  });
}
