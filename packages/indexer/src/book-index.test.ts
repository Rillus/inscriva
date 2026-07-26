import { describe, expect, it } from "vitest";
import { buildBookIndex } from "./book-index.js";

describe("buildBookIndex", () => {
  it("includes outline workflow status per chapter", () => {
    const index = buildBookIndex({
      pairs: [
        {
          key: "Ch01",
          title: "Breakfast",
          outline: "01 Outlines/Chapter Outlines/Ch01.md",
          draft: "02 Drafts/Chapters/Ch01.md",
        },
        {
          key: "Ch02",
          title: "Italy",
          outline: "01 Outlines/Chapter Outlines/Ch02.md",
        },
      ],
      draftContents: {
        "02 Drafts/Chapters/Ch01.md": "Words words words.",
      },
      outlineContents: {
        "01 Outlines/Chapter Outlines/Ch01.md": `# Ch01

## Status
Approved

## Word target
2000
`,
        "01 Outlines/Chapter Outlines/Ch02.md": `# Ch02

## Status
Drafting
`,
      },
    });

    expect(index.chapters[0]?.outlineStatus).toBe("Approved");
    expect(index.chapters[1]?.outlineStatus).toBe("Drafting");
  });
});
