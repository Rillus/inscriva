import { describe, expect, it } from "vitest";
import {
  defaultIntentForSelection,
  detectWriteWithAiAnchor,
  writeWithAiSnapshotMatchesCaret,
} from "./write-with-ai-context.js";

describe("detectWriteWithAiAnchor", () => {
  it("detects a non-empty selection", () => {
    const doc = "She ran through the woods.";
    expect(detectWriteWithAiAnchor(doc, 0, 7)).toEqual({
      from: 0,
      to: 7,
      kind: "selection",
      text: "She ran",
    });
  });

  it("ignores whitespace-only selections", () => {
    expect(detectWriteWithAiAnchor("Hello world", 5, 6)).toBeNull();
  });

  it("detects continue at a sentence end", () => {
    const doc = "The rain stopped.";
    expect(detectWriteWithAiAnchor(doc, doc.length, doc.length)).toEqual({
      from: doc.length,
      to: doc.length,
      kind: "continue",
      text: "The rain stopped.",
    });
  });

  it("prefers selection over a sentence-end caret inside the range", () => {
    const doc = "Alpha. Beta ends.";
    expect(detectWriteWithAiAnchor(doc, 7, 11)).toMatchObject({
      kind: "selection",
      text: "Beta",
    });
  });
});

describe("writeWithAiSnapshotMatchesCaret", () => {
  it("returns false when the caret no longer forms the same continue anchor", () => {
    const doc = "The rain stopped.";
    const snapshot = {
      from: doc.length,
      to: doc.length,
      kind: "continue" as const,
    };
    expect(writeWithAiSnapshotMatchesCaret(doc, 5, 5, snapshot)).toBe(false);
    expect(
      writeWithAiSnapshotMatchesCaret(doc, snapshot.from, snapshot.to, snapshot),
    ).toBe(true);
  });

  it("returns false when the selection no longer matches a prior selection snapshot", () => {
    const doc = "Alpha. Beta ends.";
    const snapshot = { from: 7, to: 11, kind: "selection" as const };
    expect(writeWithAiSnapshotMatchesCaret(doc, 0, 4, snapshot)).toBe(false);
    expect(writeWithAiSnapshotMatchesCaret(doc, 7, 11, snapshot)).toBe(true);
  });
});

describe("defaultIntentForSelection", () => {
  it("defaults short text to prompt", () => {
    expect(defaultIntentForSelection("battle scene")).toBe("prompt");
  });

  it("defaults longer text to expand", () => {
    const long =
      "She crossed the yard slowly, listening for footsteps on the gravel path behind the house.";
    expect(defaultIntentForSelection(long)).toBe("expand");
  });
});
