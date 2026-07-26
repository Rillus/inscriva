export interface WritingSessionOpen {
  chapterKey: string;
  draftPath: string;
  startedAt: string;
  wordsAtStart: number;
  targetWords?: number;
}

export interface WritingSessionClosed extends WritingSessionOpen {
  endedAt: string;
  wordsAtEnd: number;
  wordsAdded: number;
  activeSeconds: number;
}

export function openWritingSession(
  input: Omit<WritingSessionOpen, "startedAt"> & { startedAt?: string },
): WritingSessionOpen {
  return {
    ...input,
    startedAt: input.startedAt ?? new Date().toISOString(),
  };
}

export function wordsAddedInSession(wordsAtStart: number, wordsAtEnd: number): number {
  return Math.max(0, wordsAtEnd - wordsAtStart);
}

export function closeWritingSession(
  open: WritingSessionOpen,
  end: {
    wordsAtEnd: number;
    endedAt?: string;
    activeSeconds: number;
  },
): WritingSessionClosed {
  const endedAt = end.endedAt ?? new Date().toISOString();
  const wordsAdded = wordsAddedInSession(open.wordsAtStart, end.wordsAtEnd);
  return {
    ...open,
    endedAt,
    wordsAtEnd: end.wordsAtEnd,
    wordsAdded,
    activeSeconds: end.activeSeconds,
  };
}

export function appendWritingSessionLine(
  existing: string,
  record: WritingSessionClosed,
): string {
  const line = `${JSON.stringify(record)}\n`;
  return existing ? `${existing.replace(/\n?$/, "\n")}${line}` : line;
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

/** One row for `03 Revision/Writing log.md`. */
export function formatWritingLogEntry(record: WritingSessionClosed): string {
  const date = record.endedAt.slice(0, 10);
  const duration = formatDuration(record.activeSeconds);
  const target = record.targetWords ?? "—";
  return `| ${date} | ${record.chapterKey} | ${record.wordsAdded} | ${target} | ${duration} |`;
}
