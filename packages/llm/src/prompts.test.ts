import { describe, expect, it } from "vitest";
import { getTaskSystemPrompt } from "./prompts.js";

describe("getTaskSystemPrompt", () => {
  it("returns distinct instructions per task", () => {
    const draft = getTaskSystemPrompt("draft-scene");
    const review = getTaskSystemPrompt("review-continuity");
    expect(draft).toContain("draft-scene");
    expect(review).toContain("review-continuity");
    expect(draft).not.toBe(review);
  });

  it("reminds brainstorm not to write prose to draft", () => {
    expect(getTaskSystemPrompt("brainstorm")).toMatch(/bullet|outline/i);
  });
});
