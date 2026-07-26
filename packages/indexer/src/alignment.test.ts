import { describe, expect, it } from "vitest";
import {
  buildAlignmentReport,
  formatAlignmentMarkdown,
  matchSceneHeadings,
} from "./alignment.js";

const OUTLINE = `# Ch01: Test

## Word target
3000

## Must include
- Appledore table
- Festival

## NOT
- dragons

## Continuity
- P03 planted

## Scene 1 — Breakfast
**Goal:** Eat

## Scene 2 — Walk
`;

const DRAFT = `# Ch01

The Appledore table was set for breakfast before the festival.

## Scene 1 — Breakfast
They ate in silence.

P03 rope creaked on the post.

## Scene 2 — Walk
They walked home.
`;

describe("matchSceneHeadings", () => {
  it("finds matched, missing, and extra scene headings", () => {
    const r = matchSceneHeadings(OUTLINE, DRAFT);
    expect(r.matched).toHaveLength(2);
    expect(r.missing).toEqual([]);
    expect(r.extra).toEqual([]);
  });

  it("uses ## Scenes bullets when outline has no Scene N headings", () => {
    const outline = `# Ch01

## Scenes
- Chaotic Breakfast
- Nanna Floris Arrives
- Italy Announced
`;
    const draftWithTitles = `# Ch01

## Chaotic Breakfast
Text.

## Italy Announced
More.
`;
    const r = matchSceneHeadings(outline, draftWithTitles);
    expect(r.matched).toEqual(["Chaotic Breakfast", "Italy Announced"]);
    expect(r.missing).toEqual(["Nanna Floris Arrives"]);
  });
});

describe("buildAlignmentReport", () => {
  it("builds a deterministic report with word count and plants", () => {
    const report = buildAlignmentReport({
      chapterKey: "Ch01",
      outlineMarkdown: OUTLINE,
      draftMarkdown: DRAFT,
    });

    expect(report.chapterKey).toBe("Ch01");
    expect(report.wordCount.draftWords).toBeGreaterThan(0);
    expect(report.wordCount.status).toBe("under");
    expect(report.plants.unlinked).toEqual([]);
    expect(report.mustInclude.some((m) => m.item === "Appledore table")).toBe(true);
    expect(report.mustNot.some((m) => m.term === "dragons" && !m.violated)).toBe(
      true,
    );
  });
});

describe("formatAlignmentMarkdown", () => {
  it("renders a human-readable alignment report", () => {
    const report = buildAlignmentReport({
      chapterKey: "Ch01",
      outlineMarkdown: OUTLINE,
      draftMarkdown: DRAFT,
    });
    const md = formatAlignmentMarkdown(report);
    expect(md).toContain("# Alignment — Ch01");
    expect(md).toContain("Word count");
    expect(md).toContain("Must include");
  });
});
