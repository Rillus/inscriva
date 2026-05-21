import { describe, expect, it } from "vitest";
import { parseChapterFocus } from "./outline-parser.js";

const sample = `## Story question
Will Mara speak?

## Turn
She names the cost.

## Scenes
- Breakfast
- Tide

## Must include
- Table

## NOT
- Backstory

## Word target
2400

## Continuity
- P03 planted
`;

describe("parseChapterFocus", () => {
  it("extracts outline sections for the chapter panel", () => {
    const focus = parseChapterFocus(sample);

    expect(focus.storyQuestion).toBe("Will Mara speak?");
    expect(focus.turn).toBe("She names the cost.");
    expect(focus.scenes).toEqual(["Breakfast", "Tide"]);
    expect(focus.mustInclude).toEqual(["Table"]);
    expect(focus.notList).toEqual(["Backstory"]);
    expect(focus.wordTarget).toBe("2400");
    expect(focus.continuity).toEqual(["P03 planted"]);
  });
});
