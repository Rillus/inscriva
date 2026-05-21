import { describe, expect, it } from "vitest";
import { computeLineDiff } from "./text-diff.js";

describe("computeLineDiff", () => {
  it("returns empty array for identical empty strings", () => {
    expect(computeLineDiff("", "")).toEqual([]);
  });

  it("marks all lines as add when before is empty", () => {
    expect(computeLineDiff("", "Hello\nWorld")).toEqual([
      { type: "add", text: "Hello" },
      { type: "add", text: "World" },
    ]);
  });

  it("marks all lines as remove when after is empty", () => {
    expect(computeLineDiff("Hello\nWorld", "")).toEqual([
      { type: "remove", text: "Hello" },
      { type: "remove", text: "World" },
    ]);
  });

  it("marks unchanged lines as same", () => {
    expect(computeLineDiff("alpha\nbeta", "alpha\nbeta")).toEqual([
      { type: "same", text: "alpha" },
      { type: "same", text: "beta" },
    ]);
  });

  it("detects a single-line replacement", () => {
    expect(computeLineDiff("old line", "new line")).toEqual([
      { type: "remove", text: "old line" },
      { type: "add", text: "new line" },
    ]);
  });

  it("detects insertions in the middle", () => {
    expect(computeLineDiff("a\nc", "a\nb\nc")).toEqual([
      { type: "same", text: "a" },
      { type: "add", text: "b" },
      { type: "same", text: "c" },
    ]);
  });

  it("detects deletions in the middle", () => {
    expect(computeLineDiff("a\nb\nc", "a\nc")).toEqual([
      { type: "same", text: "a" },
      { type: "remove", text: "b" },
      { type: "same", text: "c" },
    ]);
  });

  it("handles multiline paragraph edits", () => {
    const before = "The harbour smelled of rope.\nShe waited.";
    const after = "The harbour smelled of salt and rope.\nShe waited.";
    const diff = computeLineDiff(before, after);
    expect(diff).toEqual([
      { type: "remove", text: "The harbour smelled of rope." },
      { type: "add", text: "The harbour smelled of salt and rope." },
      { type: "same", text: "She waited." },
    ]);
  });
});
