import { describe, expect, it } from "vitest";
import {
  applyWriteWithAiToContent,
  pendingRangeAfterApply,
} from "./write-with-ai-runner.js";

describe("applyWriteWithAiToContent", () => {
  it("replaces a selection with generated text", () => {
    expect(
      applyWriteWithAiToContent("Hello world", 0, 5, "Goodbye", "expand"),
    ).toBe("Goodbye world");
  });

  it("inserts after the cursor when continuing", () => {
    expect(
      applyWriteWithAiToContent("The rain stopped.", 17, 17, "Soon.", "continue"),
    ).toBe("The rain stopped. Soon.");
  });
});

describe("pendingRangeAfterApply", () => {
  it("returns the replaced selection span", () => {
    expect(
      pendingRangeAfterApply("Hello world", 0, 5, "Goodbye", "expand"),
    ).toEqual({ from: 0, to: 7 });
  });

  it("returns the inserted span after continue", () => {
    const content = "The rain stopped.";
    const insert = "Soon.";
    const applied = applyWriteWithAiToContent(content, 17, 17, insert, "continue");
    expect(pendingRangeAfterApply(content, 17, 17, insert, "continue")).toEqual({
      from: 18,
      to: 18 + insert.length,
    });
    expect(applied.slice(18, 18 + insert.length)).toBe(insert);
  });
});
