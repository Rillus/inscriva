import { describe, expect, it } from "vitest";
import { castIndexFromBookIndex } from "./book-workspace.js";
import type { BookIndex } from "@inscriva/indexer";

describe("castIndexFromBookIndex", () => {
  it("rebuilds lookup helpers from persisted book index characters", () => {
    const bookIndex: BookIndex = {
      version: 1,
      updatedAt: "2026-08-03T00:00:00.000Z",
      chapters: [],
      characters: [
        {
          id: "mara",
          name: "Mara",
          aliases: ["Mara Voss"],
          biblePath: "00 Canon/Character Bible/Mara.md",
          bibleExcerpt: "Protagonist.",
          appearances: [
            {
              chapterKey: "Ch01",
              draftPath: "02 Drafts/Chapters/Ch01.md",
              mentionCount: 2,
              draftWordCount: 120,
            },
          ],
          mentions: [],
          dialogue: [],
        },
      ],
    };

    const castIndex = castIndexFromBookIndex(bookIndex);
    expect(castIndex?.lookup("Mara Voss")?.name).toBe("Mara");
    expect(castIndex?.charactersInChapter("Ch01")).toHaveLength(1);
  });
});
