import { describe, expect, it } from "vitest";
import {
  DEFAULT_WORD_TARGET_BAND,
  countWords,
  draftWordTargetStatus,
  parseWordTarget,
  wordsWithinTargetBand,
} from "./word-target.js";

describe("countWords", () => {
  it("counts whitespace-separated tokens", () => {
    expect(countWords("one two\nthree")).toBe(3);
    expect(countWords("  spaced   out  ")).toBe(2);
  });

  it("returns 0 for empty content", () => {
    expect(countWords("")).toBe(0);
    expect(countWords("   \n\n  ")).toBe(0);
  });
});

describe("parseWordTarget", () => {
  it("parses a single target", () => {
    expect(parseWordTarget("3000")).toEqual({ min: 3000, max: 3000 });
  });

  it("parses a numeric range", () => {
    expect(parseWordTarget("2500-3500")).toEqual({ min: 2500, max: 3500 });
    expect(parseWordTarget("2,500 – 3,500 words")).toEqual({
      min: 2500,
      max: 3500,
    });
  });

  it("returns null when no number is found", () => {
    expect(parseWordTarget(undefined)).toBeNull();
    expect(parseWordTarget("about three thousand")).toBeNull();
  });
});

describe("wordsWithinTargetBand", () => {
  const target = { min: 3000, max: 3000 };

  it("uses 90–110% band by default", () => {
    expect(wordsWithinTargetBand(2700, target)).toBe(true);
    expect(wordsWithinTargetBand(3300, target)).toBe(true);
    expect(wordsWithinTargetBand(2699, target)).toBe(false);
    expect(wordsWithinTargetBand(3301, target)).toBe(false);
  });

  it("respects custom band ratios", () => {
    expect(
      wordsWithinTargetBand(3000, target, { minRatio: 0.8, maxRatio: 1.2 }),
    ).toBe(true);
    expect(
      wordsWithinTargetBand(2399, target, { minRatio: 0.8, maxRatio: 1.2 }),
    ).toBe(false);
    expect(
      wordsWithinTargetBand(3601, target, { minRatio: 0.8, maxRatio: 1.2 }),
    ).toBe(false);
  });
});

describe("draftWordTargetStatus", () => {
  it("classifies under, within band, and over", () => {
    const target = { min: 3000, max: 3000 };
    expect(draftWordTargetStatus(1000, target)).toBe("under");
    expect(draftWordTargetStatus(3000, target)).toBe("within");
    expect(draftWordTargetStatus(4000, target)).toBe("over");
  });

  it("returns unknown when target is missing", () => {
    expect(draftWordTargetStatus(500, null)).toBe("unknown");
  });
});

describe("DEFAULT_WORD_TARGET_BAND", () => {
  it("locks recommendation band to 90–110%", () => {
    expect(DEFAULT_WORD_TARGET_BAND).toEqual({ minRatio: 0.9, maxRatio: 1.1 });
  });
});
