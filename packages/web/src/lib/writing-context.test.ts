import { describe, expect, it } from "vitest";
import { buildCanonIndex } from "@inscriva/indexer";
import { sceneHeadingBeforeOffset } from "./editor-selection.js";
import {
  assembleWritingContext,
  formatChapterFocusForContext,
  resolveCurrentScene,
} from "./writing-context.js";
import { parseChapterFocus } from "./outline-parser.js";

const outline = `## Story question
Will Mara speak?

## Scenes
- Breakfast table
- Tide and rope

## Must include
- Festival deadline
`;

describe("resolveCurrentScene", () => {
  it("matches a scene heading to an outline scene", () => {
    expect(
      resolveCurrentScene("Breakfast table", ["Breakfast table", "Tide and rope"]),
    ).toBe("Breakfast table");
  });

  it("returns the heading when it is not listed in the outline", () => {
    expect(resolveCurrentScene("Interlude", ["Breakfast table"])).toBe(
      "Interlude",
    );
  });
});

describe("sceneHeadingBeforeOffset", () => {
  it("finds the nearest scene heading before the caret", () => {
    const doc = "# Chapter\n\n## Breakfast table\n\nMara ate.\n\n## Tide\n\nWater.";
    const tidePos = doc.indexOf("Water");
    expect(sceneHeadingBeforeOffset(doc, tidePos)).toBe("Tide");
  });
});

describe("formatChapterFocusForContext", () => {
  it("marks the current scene in the scene list", () => {
    const focus = parseChapterFocus(outline);
    const text = formatChapterFocusForContext(focus, "Breakfast table");
    expect(text).toContain("**Current scene:** Breakfast table");
    expect(text).toContain("- Breakfast table ← current");
  });
});

describe("assembleWritingContext", () => {
  it("includes chapter focus, draft excerpt, and relevant canon", () => {
    const draft = `# Ch01

## Breakfast table

Mara set down her cup. [[Mara]] watched the harbour.`;

    const canon = buildCanonIndex(
      new Map([
        [
          "00 Canon/Character Bible/Mara.md",
          "# Mara\n\nAlso known as: Mara Voss\n\nCaptain with dry humour.",
        ],
      ]),
    );

    const offset = draft.indexOf("harbour");
    const ctx = assembleWritingContext({
      editorContent: draft,
      outlineContent: outline,
      canonIndex: canon,
      offset,
      workingText: "Mara set down her cup.",
    });

    expect(ctx.draftExcerpt).toContain("Mara set down her cup");
    expect(ctx.chapterFocus).toContain("Breakfast table");
    expect(ctx.relevantCanon).toContain("Mara");
  });
});
