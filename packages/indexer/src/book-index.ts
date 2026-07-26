import type { AlignmentReport } from "./alignment.js";
import type { ChapterPair } from "./chapter-pairing.js";
import { parseChapterFocus } from "./outline-parse.js";
import { countWords, parseWordTarget } from "./word-target.js";

export interface BookIndexChapter {
  key: string;
  title: string;
  outline?: string;
  draft?: string;
  draftWordCount: number;
  wordTarget?: { min: number; max: number };
  alignmentGeneratedAt?: string;
  alignmentSummary?: "ok" | "warnings" | "stale";
  /** From outline ## Status or front matter `status:` */
  outlineStatus?: string;
}

export interface BookIndex {
  version: 1;
  updatedAt: string;
  chapters: BookIndexChapter[];
}

export function alignmentSummaryFromReport(
  report: AlignmentReport,
  draftMtime?: string,
  outlineMtime?: string,
): "ok" | "warnings" | "stale" {
  const reportTime = Date.parse(report.generatedAt);
  if (draftMtime && Date.parse(draftMtime) > reportTime) return "stale";
  if (outlineMtime && Date.parse(outlineMtime) > reportTime) return "stale";

  const hasWarnings =
    report.wordCount.status === "over" ||
    report.plants.unlinked.length > 0 ||
    report.scenes.missing.length > 0 ||
    report.mustInclude.some((m) => m.status === "miss") ||
    report.mustNot.some((m) => m.violated);

  return hasWarnings ? "warnings" : "ok";
}

export function buildBookIndex(input: {
  pairs: ChapterPair[];
  draftContents: Record<string, string>;
  outlineContents: Record<string, string>;
  alignmentByChapter?: Record<string, AlignmentReport>;
}): BookIndex {
  const chapters: BookIndexChapter[] = input.pairs.map((pair) => {
    const draftMd = pair.draft ? input.draftContents[pair.draft] ?? "" : "";
    const outlineMd = pair.outline ? input.outlineContents[pair.outline] ?? "" : "";
    const focus = parseChapterFocus(outlineMd);
    const target = parseWordTarget(focus.wordTarget);
    const report = input.alignmentByChapter?.[pair.key];

    return {
      key: pair.key,
      title: pair.title ?? pair.key,
      outline: pair.outline,
      draft: pair.draft,
      draftWordCount: countWords(draftMd),
      wordTarget: target ?? undefined,
      alignmentGeneratedAt: report?.generatedAt,
      alignmentSummary: report
        ? alignmentSummaryFromReport(report)
        : undefined,
      outlineStatus: focus.status,
    };
  });

  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    chapters,
  };
}

export function serialiseBookIndex(index: BookIndex): string {
  return `${JSON.stringify(index, null, 2)}\n`;
}

export function parseBookIndex(raw: string): BookIndex | null {
  try {
    const data = JSON.parse(raw) as BookIndex;
    if (data?.version !== 1 || !Array.isArray(data.chapters)) return null;
    return data;
  } catch {
    return null;
  }
}
