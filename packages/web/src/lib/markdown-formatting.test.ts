import { describe, expect, it } from "vitest";
import {
  rangeOverlaps,
  unwrapInlineMarkers,
  wordBoundsInDoc,
  wrapRangeWithMarkers,
} from "./markdown-formatting.js";

describe("rangeOverlaps", () => {
  it("detects overlapping ranges", () => {
    expect(rangeOverlaps(0, 5, 3, 8)).toBe(true);
  });

  it("treats touching ranges as non-overlapping", () => {
    expect(rangeOverlaps(0, 5, 5, 10)).toBe(false);
  });
});

describe("wordBoundsInDoc", () => {
  it("returns the word under the cursor", () => {
    expect(wordBoundsInDoc("hello *Agricole* world", 8)).toEqual({
      from: 7,
      to: 15,
    });
  });

  it("returns an empty range when there is no word", () => {
    expect(wordBoundsInDoc("***", 1)).toEqual({ from: 1, to: 1 });
  });
});

describe("wrapRangeWithMarkers", () => {
  it("wraps the selected span with markers", () => {
    expect(wrapRangeWithMarkers("Agricole", 0, 8, "**")).toEqual({
      text: "**Agricole**",
      selectionFrom: 2,
      selectionTo: 10,
    });
  });
});

describe("unwrapInlineMarkers", () => {
  it("removes opening and closing markers", () => {
    expect(unwrapInlineMarkers("**Agricole**", 0, 2, 10, 12)).toEqual({
      text: "Agricole",
      selectionFrom: 0,
      selectionTo: 8,
    });
  });
});
