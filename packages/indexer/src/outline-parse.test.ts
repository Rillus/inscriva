import { describe, expect, it } from "vitest";
import { parseChapterFocus } from "./outline-parse.js";

const TEMPLATE = `## Story question
Will Mara speak?

## Turn
She names the cost.

## Scenes
- Breakfast
- Tide

## Must include
- Appledore

## NOT
- Backstory dump

## Word target
2400

## Continuity
- P03 planted
`;

const MONSTEROSSO = `# Ch01: The Cabbages at Breakfast

## Story question
Will Cole face the ledger?

## Turn by chapter end
Cole admits the debt is his.

## Scene 1 — The market stall
**Goal:** Sell the last cabbages
**Conflict:** Inspector arrives
**Outcome:** Cole hides the ledger
**Must include:** market stall
**Must NOT:** violence

## Scene 2 — The walk home
**Goal:** Reach the farm
**Must include:** [[Character Bible/Cole]]

## Word target
3000
`;

describe("parseChapterFocus", () => {
  it("parses template outline sections", () => {
    const f = parseChapterFocus(TEMPLATE);
    expect(f.storyQuestion).toBe("Will Mara speak?");
    expect(f.turn).toBe("She names the cost.");
    expect(f.scenes.map((s) => s.title)).toEqual(["Breakfast", "Tide"]);
    expect(f.mustInclude).toContain("Appledore");
    expect(f.notList).toContain("Backstory dump");
    expect(f.wordTarget).toBe("2400");
    expect(f.continuity).toContain("P03 planted");
  });

  it("parses ## Status and numbered scene lists", () => {
    const md = `# Ch01

## Status
Approved

## Scenes
1. Breakfast table — tension
2. Tide / rope
`;
    const f = parseChapterFocus(md);
    expect(f.status).toBe("Approved");
    expect(f.scenes.map((s) => s.title)).toEqual([
      "Breakfast table — tension",
      "Tide / rope",
    ]);
  });

  it("parses Monsterosso scene cards and turn-by-chapter-end", () => {
    const f = parseChapterFocus(MONSTEROSSO);
    expect(f.storyQuestion).toContain("Cole");
    expect(f.turnByChapterEnd).toContain("admits the debt");
    expect(f.sceneCards).toHaveLength(2);
    expect(f.sceneCards[0]).toMatchObject({
      number: 1,
      title: "The market stall",
      goal: "Sell the last cabbages",
      mustInclude: ["market stall"],
      mustNot: ["violence"],
    });
    expect(f.scenes.map((s) => s.title)).toEqual([
      "The market stall",
      "The walk home",
    ]);
  });
});
