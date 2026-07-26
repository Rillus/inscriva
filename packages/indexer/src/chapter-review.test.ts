import { describe, expect, it } from "vitest";
import {
  aiReviewExportPath,
  formatAiReviewMarkdown,
  parseAiReviewStatus,
  setOutlineStatus,
} from "./chapter-review.js";

describe("aiReviewExportPath", () => {
  it("writes under the public alignment folder", () => {
    expect(aiReviewExportPath("Ch01")).toBe(
      "03 Revision/Alignment/Ch01 - AI review.md",
    );
  });
});

describe("parseAiReviewStatus", () => {
  it("reads a bold Status line from the review", () => {
    const md = "### Reviewer Comments\n\n**Status:** **Approved.** Proceed to Ch02.";
    expect(parseAiReviewStatus(md)).toBe("Approved");
  });

  it("returns null when no status line", () => {
    expect(parseAiReviewStatus("# Review\n\nAll good.")).toBeNull();
  });
});

describe("setOutlineStatus", () => {
  it("updates an existing ## Status section", () => {
    const outline = `# Ch01

## Status
Drafting

## Story question
Who is Cole?
`;
    const next = setOutlineStatus(outline, "Aligned");
    expect(next).toContain("## Status\nAligned");
    expect(next).not.toContain("Drafting");
  });

  it("sets front matter status when present", () => {
    const outline = `---
status: drafting
---

# Ch01
`;
    const next = setOutlineStatus(outline, "Aligned");
    expect(next).toMatch(/^status:\s*Aligned/m);
  });
});

describe("formatAiReviewMarkdown", () => {
  it("adds a generated header", () => {
    const md = formatAiReviewMarkdown("Ch01", "# Review\n\nDone.", "2026-05-22T12:00:00Z");
    expect(md).toContain("# AI chapter review — Ch01");
    expect(md).toContain("_Generated");
    expect(md).toContain("# Review");
  });
});
