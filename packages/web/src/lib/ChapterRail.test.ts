import { describe, expect, it } from "vitest";
import { isChapterWorkflowComplete } from "@inscriva/indexer";

describe("ChapterRail completion", () => {
  it("treats Approved and Completed as workflow-complete", () => {
    expect(isChapterWorkflowComplete("Approved")).toBe(true);
    expect(isChapterWorkflowComplete("Completed")).toBe(true);
    expect(isChapterWorkflowComplete("Drafting")).toBe(false);
  });
});
