import { describe, expect, it } from "vitest";
import {
  characterAppearancesPath,
  formatCharacterAppearancesMarkdown,
  GENERATED_APPEARANCES_DIR,
} from "./character-appearances.js";
import type { CastCharacter } from "./cast-index.js";

const character: CastCharacter = {
  id: "mara",
  name: "Mara",
  aliases: ["Mara Voss"],
  biblePath: "00 Canon/Character Bible/Mara.md",
  bibleExcerpt: "Protagonist.",
  appearances: [
    {
      chapterKey: "Ch01",
      draftPath: "02 Drafts/Chapters/Ch01.md",
      mentionCount: 3,
      draftWordCount: 120,
    },
  ],
  mentions: [
    {
      chapterKey: "Ch01",
      draftPath: "02 Drafts/Chapters/Ch01.md",
      offset: 10,
      snippet: "Mara set down her cup",
    },
  ],
  dialogue: [
    {
      chapterKey: "Ch01",
      draftPath: "02 Drafts/Chapters/Ch01.md",
      quote: "We should tell them",
      line: 'She said, "We should tell them"',
    },
  ],
};

describe("character-appearances", () => {
  it("uses generated appearances directory", () => {
    expect(GENERATED_APPEARANCES_DIR).toBe(
      "00 Canon/Character Bible/_generated/",
    );
    expect(characterAppearancesPath("Mara")).toBe(
      "00 Canon/Character Bible/_generated/Mara - appearances.md",
    );
  });

  it("formats appearances markdown from cast data", () => {
    const md = formatCharacterAppearancesMarkdown(
      character,
      "2026-08-04T08:00:00.000Z",
    );
    expect(md).toContain("# Mara — appearances");
    expect(md).toContain("Ch01");
    expect(md).toContain("We should tell them");
    expect(md).toContain("_Generated");
  });
});
