import { describe, expect, it } from "vitest";
import { extractChapterKey, pairChapters } from "./chapter-pairing.js";

describe("extractChapterKey", () => {
  it("extracts Ch01 from draft filenames", () => {
    expect(extractChapterKey("Ch01 - The Eighth A.md")).toBe("Ch01");
    expect(extractChapterKey("02 Drafts/Chapters/Ch02.md")).toBe("Ch02");
  });

  it("returns null when no chapter key", () => {
    expect(extractChapterKey("Master Outline.md")).toBeNull();
  });
});

describe("pairChapters", () => {
  const files = [
    "01 Outlines/Chapter Outlines/Ch01 - The Eighth A.md",
    "02 Drafts/Chapters/Ch01 - The Eighth A.md",
    "01 Outlines/Chapter Outlines/Ch02.md",
    "02 Drafts/Chapters/Ch02.md",
    "01 Outlines/Master Outline.md",
  ];

  it("pairs outlines with drafts by chapter key", () => {
    const pairs = pairChapters(files);

    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toEqual({
      key: "Ch01",
      outline: "01 Outlines/Chapter Outlines/Ch01 - The Eighth A.md",
      draft: "02 Drafts/Chapters/Ch01 - The Eighth A.md",
    });
  });

  it("applies chapter-map overrides", () => {
    const overrides = { Ch02: { draft: "02 Drafts/Chapters/Ch02-alt.md" } };
    const pairs = pairChapters(files, overrides);

    const ch02 = pairs.find((p) => p.key === "Ch02")!;
    expect(ch02.draft).toBe("02 Drafts/Chapters/Ch02-alt.md");
  });
});
