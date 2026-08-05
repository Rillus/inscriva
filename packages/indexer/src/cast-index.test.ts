import { describe, expect, it } from "vitest";
import {
  buildCastIndex,
  parseCharacterDefinitions,
  type CastIndexInput,
} from "./cast-index.js";

describe("parseCharacterDefinitions", () => {
  it("parses per-character bible files", () => {
    const files = new Map([
      [
        "00 Canon/Character Bible/Mara.md",
        `# Mara\n\nAlso known as: Mara Voss\n\nProtagonist of the novella.`,
      ],
      [
        "00 Canon/Character Bible/Cole.md",
        `# Cole\n\nAlso known as: Agricole\n\nMara's brother.`,
      ],
    ]);

    const defs = parseCharacterDefinitions(files);
    expect(defs.map((d) => d.name).sort()).toEqual(["Cole", "Mara"]);
    expect(defs.find((d) => d.name === "Mara")?.aliases).toContain("Mara Voss");
  });

  it("parses ### sections from a single Character Bible file", () => {
    const files = new Map([
      [
        "00 Canon/Character Bible.md",
        `# Character Bible

### Mara
Also known as: Mara Voss
Protagonist.

### Cole
Also known as: Agricole
Brother.`,
      ],
    ]);

    const defs = parseCharacterDefinitions(files);
    expect(defs.map((d) => d.name).sort()).toEqual(["Cole", "Mara"]);
    expect(defs.find((d) => d.name === "Cole")?.biblePath).toBe(
      "00 Canon/Character Bible.md#Cole",
    );
  });
});

describe("buildCastIndex", () => {
  const bibleFiles = new Map([
    [
      "00 Canon/Character Bible/Mara.md",
      `# Mara\n\nAlso known as: Mara Voss\n\nProtagonist.`,
    ],
    [
      "00 Canon/Character Bible/Cole.md",
      `# Cole\n\nAlso known as: Agricole\n\nBrother.`,
    ],
  ]);

  const baseInput: CastIndexInput = {
    characterFiles: bibleFiles,
    pairs: [
      {
        key: "Ch01",
        title: "Breakfast",
        draft: "02 Drafts/Chapters/Ch01.md",
      },
      {
        key: "Ch02",
        title: "Italy",
        draft: "02 Drafts/Chapters/Ch02.md",
      },
    ],
    draftContents: {
      "02 Drafts/Chapters/Ch01.md": `# Ch01

Mara set down her cup without looking at anyone.

She said, "We should tell them before the festival."

No one answered.`,
      "02 Drafts/Chapters/Ch02.md": `# Ch02

Cole waited on the pier. Agricole watched the tide.`,
    },
  };

  it("indexes mentions and appearances per chapter", () => {
    const index = buildCastIndex(baseInput);
    const mara = index.characters.find((c) => c.name === "Mara")!;

    expect(mara.appearances).toHaveLength(1);
    expect(mara.appearances[0]?.chapterKey).toBe("Ch01");
    expect(mara.appearances[0]?.mentionCount).toBeGreaterThanOrEqual(1);
    expect(mara.mentions.some((m) => m.chapterKey === "Ch01")).toBe(true);
  });

  it("matches aliases in draft text", () => {
    const index = buildCastIndex(baseInput);
    const cole = index.characters.find((c) => c.name === "Cole")!;

    expect(cole.appearances.map((a) => a.chapterKey)).toContain("Ch02");
    expect(cole.mentions.some((m) => m.snippet.includes("Agricole"))).toBe(
      true,
    );
  });

  it("extracts attributed dialogue heuristically", () => {
    const index = buildCastIndex(baseInput);
    const mara = index.characters.find((c) => c.name === "Mara")!;

    expect(
      mara.dialogue.some(
        (d) =>
          d.chapterKey === "Ch01" &&
          d.quote.includes("We should tell them"),
      ),
    ).toBe(true);
  });

  it("lookup resolves names and aliases", () => {
    const index = buildCastIndex(baseInput);
    expect(index.lookup("Mara Voss")?.name).toBe("Mara");
    expect(index.lookup("agricole")?.name).toBe("Cole");
  });

  it("charactersInChapter filters to a chapter key", () => {
    const index = buildCastIndex(baseInput);
    const ch01 = index.charactersInChapter("Ch01").map((c) => c.name);
    expect(ch01).toContain("Mara");
    expect(ch01).not.toContain("Cole");
  });
});
