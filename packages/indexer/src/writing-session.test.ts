import { describe, expect, it } from "vitest";
import {
  appendWritingSessionLine,
  closeWritingSession,
  formatWritingLogEntry,
  openWritingSession,
  wordsAddedInSession,
} from "./writing-session.js";

describe("openWritingSession", () => {
  it("records start time, chapter, and baseline word count", () => {
    const session = openWritingSession({
      chapterKey: "Ch01",
      draftPath: "02 Drafts/Chapters/Ch01.md",
      wordsAtStart: 1200,
      targetWords: 3000,
    });

    expect(session.chapterKey).toBe("Ch01");
    expect(session.wordsAtStart).toBe(1200);
    expect(session.targetWords).toBe(3000);
    expect(session.startedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(session.endedAt).toBeUndefined();
  });
});

describe("closeWritingSession", () => {
  it("computes duration and words added", () => {
    const started = openWritingSession({
      chapterKey: "Ch01",
      draftPath: "02 Drafts/Chapters/Ch01.md",
      wordsAtStart: 100,
      targetWords: 500,
    });

    const closed = closeWritingSession(started, {
      wordsAtEnd: 350,
      endedAt: "2026-05-22T12:30:00.000Z",
      activeSeconds: 2700,
    });

    expect(closed.wordsAtEnd).toBe(350);
    expect(closed.wordsAdded).toBe(250);
    expect(closed.activeSeconds).toBe(2700);
    expect(closed.endedAt).toBe("2026-05-22T12:30:00.000Z");
  });
});

describe("wordsAddedInSession", () => {
  it("never returns negative deltas", () => {
    expect(wordsAddedInSession(500, 400)).toBe(0);
    expect(wordsAddedInSession(500, 650)).toBe(150);
  });
});

describe("appendWritingSessionLine", () => {
  it("appends one JSON line", () => {
    const line = appendWritingSessionLine("", {
      chapterKey: "Ch01",
      draftPath: "02 Drafts/Chapters/Ch01.md",
      startedAt: "2026-05-22T10:00:00.000Z",
      endedAt: "2026-05-22T11:00:00.000Z",
      wordsAtStart: 100,
      wordsAtEnd: 200,
      wordsAdded: 100,
      targetWords: 500,
      activeSeconds: 3600,
    });

    expect(line.trim().split("\n")).toHaveLength(1);
    expect(JSON.parse(line.trim())).toMatchObject({
      chapterKey: "Ch01",
      wordsAdded: 100,
      activeSeconds: 3600,
    });
  });

  it("preserves prior lines", () => {
    const prior = '{"chapterKey":"Ch00"}\n';
    const next = appendWritingSessionLine(prior, {
      chapterKey: "Ch01",
      draftPath: "x.md",
      startedAt: "2026-05-22T10:00:00.000Z",
      endedAt: "2026-05-22T11:00:00.000Z",
      wordsAtStart: 0,
      wordsAtEnd: 10,
      wordsAdded: 10,
      activeSeconds: 60,
    });

    expect(next.trim().split("\n")).toHaveLength(2);
  });
});

describe("formatWritingLogEntry", () => {
  it("renders a markdown table row for the public revision log", () => {
    const row = formatWritingLogEntry({
      chapterKey: "Ch01",
      draftPath: "02 Drafts/Chapters/Ch01.md",
      startedAt: "2026-05-22T10:00:00.000Z",
      endedAt: "2026-05-22T11:15:00.000Z",
      wordsAtStart: 800,
      wordsAtEnd: 1050,
      wordsAdded: 250,
      targetWords: 3000,
      activeSeconds: 4500,
    });

    expect(row).toContain("| 2026-05-22");
    expect(row).toContain("| Ch01 |");
    expect(row).toContain("| 250 |");
    expect(row).toContain("| 3000 |");
    expect(row).toContain("| 1h 15m |");
  });
});
