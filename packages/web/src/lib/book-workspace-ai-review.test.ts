import { describe, expect, it, vi } from "vitest";
import { persistAiChapterReview } from "./book-workspace.js";

describe("persistAiChapterReview", () => {
  it("writes the review export and can update outline status", async () => {
    const writes: Record<string, string> = {};
    const bridge = {
      readFile: vi.fn(async (path: string) => {
        if (path === "02 Outline/Ch01.md") {
          return "# Ch01\n\n## Status\nDrafting\n";
        }
        throw new Error("missing");
      }),
      writeFile: vi.fn(async (path: string, content: string) => {
        writes[path] = content;
      }),
    };

    const output = "**Status:** **Approved.** Proceed to Ch02.";
    const first = await persistAiChapterReview(bridge as never, {
      chapterKey: "Ch01",
      output,
    });
    expect(first.exportPath).toBe("03 Revision/Alignment/Ch01 - AI review.md");
    expect(first.parsedStatus).toBe("Approved");
    expect(writes[first.exportPath]).toContain("Approved");

    await persistAiChapterReview(bridge as never, {
      chapterKey: "Ch01",
      output,
      outlinePath: "02 Outline/Ch01.md",
      updateOutlineStatus: true,
    });
    expect(writes["02 Outline/Ch01.md"]).toContain("## Status\nApproved");
  });
});
