import { describe, expect, it } from "vitest";
import {
  extractTitleFromFilename,
  extractTitleFromOutline,
  resolveChapterTitle,
} from "./chapter-title.js";

describe("extractTitleFromOutline", () => {
  it("parses a real Ch01 H1", () => {
    expect(
      extractTitleFromOutline("# Ch01: The Cabbages at Breakfast\n\n## Story question"),
    ).toBe("The Cabbages at Breakfast");
  });

  it("rejects template ChNN placeholder H1", () => {
    expect(
      extractTitleFromOutline("# ChNN — [Working title]\n\n## Story question"),
    ).toBeNull();
  });
});

describe("extractTitleFromFilename", () => {
  it("strips ChNN prefix from draft filename", () => {
    expect(extractTitleFromFilename("Ch01 - The Eighth A.md")).toBe("The Eighth A");
  });

  it("strips numeric prefix from filename", () => {
    expect(extractTitleFromFilename("01 - Breakfast.md")).toBe("Breakfast");
  });
});

describe("resolveChapterTitle", () => {
  it("prefers outline title when it is not a placeholder", () => {
    expect(
      resolveChapterTitle({
        outlineMarkdown: "# Ch01 — Real title",
        draftPath: "Ch01 - From file.md",
      }),
    ).toBe("Real title");
  });

  it("falls back to draft filename when outline H1 is a template", () => {
    expect(
      resolveChapterTitle({
        outlineMarkdown: "# ChNN — [Working title]",
        draftPath: "02 Drafts/Chapters/Ch01 - The Eighth A.md",
      }),
    ).toBe("The Eighth A");
  });
});
