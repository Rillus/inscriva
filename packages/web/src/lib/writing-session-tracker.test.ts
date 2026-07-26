import { describe, expect, it, vi } from "vitest";
import {
  createWritingSessionTracker,
  formatSessionClock,
} from "./writing-session-tracker.js";

describe("createWritingSessionTracker", () => {
  it("accumulates active seconds while editing", () => {
    vi.useFakeTimers();
    const t = createWritingSessionTracker(60_000);
    t.start({
      chapterKey: "Ch01",
      draftPath: "draft.md",
      wordsAtStart: 100,
    });
    vi.advanceTimersByTime(5000);
    t.tick();
    t.onEdit(150);
    expect(t.wordsAdded()).toBe(50);
    expect(t.state?.activeSeconds).toBeGreaterThanOrEqual(4);
    vi.useRealTimers();
  });

  it("pauses after idle threshold", () => {
    vi.useFakeTimers();
    const t = createWritingSessionTracker(2000);
    t.start({
      chapterKey: "Ch01",
      draftPath: "draft.md",
      wordsAtStart: 0,
    });
    vi.advanceTimersByTime(5000);
    t.tick();
    expect(t.state?.paused).toBe(true);
    vi.useRealTimers();
  });
});

describe("formatSessionClock", () => {
  it("formats mm:ss and paused label", () => {
    expect(formatSessionClock(125, false)).toBe("2:05");
    expect(formatSessionClock(125, true)).toContain("paused");
  });
});
