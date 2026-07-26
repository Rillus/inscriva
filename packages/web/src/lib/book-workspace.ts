import type { InscrivaBridge } from "@inscriva/bridge";
import {
  aiReviewExportPath,
  alignmentReportCachePath,
  alignmentReportExportPath,
  appendWritingSessionLine,
  formatAiReviewMarkdown,
  parseAiReviewStatus,
  setOutlineStatus,
  BOOK_INDEX_PATH,
  buildAlignmentReport,
  buildBookIndex,
  CHAPTER_MAP_PATH,
  closeWritingSession,
  formatAlignmentMarkdown,
  formatWritingLogEntry,
  GOAL_CHECKS_PATH,
  pairChapters,
  parseBookIndex,
  parseGoalChecks,
  serialiseBookIndex,
  serialiseGoalChecks,
  type AlignmentReport,
  type BookIndex,
  type ChapterMapOverrides,
  type ChapterPair,
  type GoalChecksByChapter,
  type WritingSessionClosed,
  WRITING_LOG_PATH,
  WRITING_SESSIONS_PATH,
} from "@inscriva/indexer";

const WRITING_LOG_HEADER = `# Writing log

| Date | Chapter | Words added | Target | Active time |
|------|---------|-------------|--------|-------------|
`;

export function parseChapterMap(raw: string): ChapterMapOverrides {
  try {
    const data = JSON.parse(raw) as ChapterMapOverrides;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function serialiseChapterMap(map: ChapterMapOverrides): string {
  return `${JSON.stringify(map, null, 2)}\n`;
}

export async function loadChapterMap(
  bridge: InscrivaBridge,
): Promise<ChapterMapOverrides> {
  try {
    return parseChapterMap(await bridge.readFile(CHAPTER_MAP_PATH));
  } catch {
    return {};
  }
}

export async function saveChapterMap(
  bridge: InscrivaBridge,
  map: ChapterMapOverrides,
): Promise<void> {
  await bridge.writeFile(CHAPTER_MAP_PATH, serialiseChapterMap(map));
}

export async function loadGoalChecks(
  bridge: InscrivaBridge,
): Promise<GoalChecksByChapter> {
  try {
    return parseGoalChecks(await bridge.readFile(GOAL_CHECKS_PATH));
  } catch {
    return {};
  }
}

export async function saveGoalChecks(
  bridge: InscrivaBridge,
  checks: GoalChecksByChapter,
): Promise<void> {
  await bridge.writeFile(GOAL_CHECKS_PATH, serialiseGoalChecks(checks));
}

export async function loadPairsWithContents(
  bridge: InscrivaBridge,
  filePaths: string[],
  overrides: ChapterMapOverrides,
): Promise<{
  pairs: ChapterPair[];
  outlineContents: Record<string, string>;
  draftContents: Record<string, string>;
}> {
  const outlinePaths = filePaths.filter((p) =>
    p.includes("Chapter Outlines/"),
  );
  const outlineContents: Record<string, string> = {};
  await Promise.all(
    outlinePaths.map(async (p) => {
      outlineContents[p] = await bridge.readFile(p);
    }),
  );
  const pairs = pairChapters({ paths: filePaths, overrides, outlineContents });
  const draftContents: Record<string, string> = {};
  await Promise.all(
    pairs
      .filter((p) => p.draft)
      .map(async (p) => {
        draftContents[p.draft!] = await bridge.readFile(p.draft!);
      }),
  );
  return { pairs, outlineContents, draftContents };
}

export async function persistAlignmentReport(
  bridge: InscrivaBridge,
  report: AlignmentReport,
): Promise<void> {
  await bridge.writeFile(
    alignmentReportCachePath(report.chapterKey),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  await bridge.writeFile(
    alignmentReportExportPath(report.chapterKey),
    formatAlignmentMarkdown(report),
  );
}

export async function loadAlignmentReport(
  bridge: InscrivaBridge,
  chapterKey: string,
): Promise<AlignmentReport | null> {
  try {
    const raw = await bridge.readFile(alignmentReportCachePath(chapterKey));
    return JSON.parse(raw) as AlignmentReport;
  } catch {
    return null;
  }
}

export async function refreshBookIndex(
  bridge: InscrivaBridge,
  input: {
    pairs: ChapterPair[];
    draftContents: Record<string, string>;
    outlineContents: Record<string, string>;
    alignmentByChapter?: Record<string, AlignmentReport>;
  },
): Promise<BookIndex> {
  const index = buildBookIndex(input);
  await bridge.writeFile(BOOK_INDEX_PATH, serialiseBookIndex(index));
  return index;
}

export async function loadBookIndex(
  bridge: InscrivaBridge,
): Promise<BookIndex | null> {
  try {
    return parseBookIndex(await bridge.readFile(BOOK_INDEX_PATH));
  } catch {
    return null;
  }
}

export async function appendClosedWritingSession(
  bridge: InscrivaBridge,
  open: {
    chapterKey: string;
    draftPath: string;
    wordsAtStart: number;
    targetWords?: number;
    startedAt: string;
  },
  end: { wordsAtEnd: number; activeSeconds: number; endedAt?: string },
): Promise<void> {
  const full: WritingSessionClosed = closeWritingSession(
    {
      chapterKey: open.chapterKey,
      draftPath: open.draftPath,
      wordsAtStart: open.wordsAtStart,
      targetWords: open.targetWords,
      startedAt: open.startedAt,
    },
    end,
  );

  let existing = "";
  try {
    existing = await bridge.readFile(WRITING_SESSIONS_PATH);
  } catch {
    /* new log */
  }
  await bridge.writeFile(
    WRITING_SESSIONS_PATH,
    appendWritingSessionLine(existing, full),
  );

  let logMd = "";
  try {
    logMd = await bridge.readFile(WRITING_LOG_PATH);
  } catch {
    logMd = WRITING_LOG_HEADER;
  }
  if (!logMd.includes("| Date |")) {
    logMd = WRITING_LOG_HEADER;
  }
  await bridge.writeFile(
    WRITING_LOG_PATH,
    `${logMd.trimEnd()}\n${formatWritingLogEntry(full)}\n`,
  );
}

export interface PersistAiReviewResult {
  exportPath: string;
  parsedStatus: string | null;
}

export async function persistAiChapterReview(
  bridge: InscrivaBridge,
  input: {
    chapterKey: string;
    output: string;
    outlinePath?: string;
    updateOutlineStatus?: boolean;
  },
): Promise<PersistAiReviewResult> {
  const generatedAt = new Date().toISOString();
  const exportPath = aiReviewExportPath(input.chapterKey);
  await bridge.writeFile(
    exportPath,
    formatAiReviewMarkdown(input.chapterKey, input.output, generatedAt),
  );

  const parsedStatus = parseAiReviewStatus(input.output);
  if (input.updateOutlineStatus && parsedStatus && input.outlinePath) {
    const outline = await bridge.readFile(input.outlinePath);
    await bridge.writeFile(
      input.outlinePath,
      setOutlineStatus(outline, parsedStatus),
    );
  }

  return { exportPath, parsedStatus };
}

export { buildAlignmentReport };
