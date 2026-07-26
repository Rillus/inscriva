import { describe, expect, it } from "vitest";
import {
  findMasterChapterAtOffset,
  formatMasterChapterForContext,
  parseMasterOutline,
} from "./master-outline-parse.js";

const SAMPLE = `# Master Outline

## Ch01 — The Eighth A
**Story question:** Will Mara break the silence?
**Turn:** She names the cost of the lie.
**Word target:** 2400

## Scenes
- Breakfast table — tension
- Tide / rope — decision

## Must include
- Appledore breakfast table

## NOT
- Full backstory

## Continuity
- P03 planted

## Ch02 — Italy
**Story question:** Can Cole survive Nanna?
**Turn:** Italy is announced.

## Scenes
- Chaotic breakfast
- Nanna Floris arrives
`;

describe("parseMasterOutline", () => {
  it("reads ## ChNN — Title blocks and fields", () => {
    const doc = parseMasterOutline(SAMPLE);
    expect(doc.chapters).toHaveLength(2);
    expect(doc.chapters[0]).toMatchObject({
      key: "Ch01",
      title: "The Eighth A",
      storyQuestion: "Will Mara break the silence?",
      turn: "She names the cost of the lie.",
      wordTarget: "2400",
    });
    expect(doc.chapters[0]!.scenes).toEqual([
      "Breakfast table — tension",
      "Tide / rope — decision",
    ]);
    expect(doc.chapters[0]!.mustInclude).toContain("Appledore breakfast table");
    expect(doc.chapters[1]!.key).toBe("Ch02");
    expect(doc.chapters[1]!.scenes).toHaveLength(2);
  });
});

describe("findMasterChapterAtOffset", () => {
  it("returns the chapter block containing the caret", () => {
    const idx = SAMPLE.indexOf("## Ch02");
    const ch = findMasterChapterAtOffset(SAMPLE, idx + 10);
    expect(ch?.key).toBe("Ch02");
  });
});

describe("formatMasterChapterForContext", () => {
  it("serialises a chapter beat for the model", () => {
    const doc = parseMasterOutline(SAMPLE);
    const text = formatMasterChapterForContext(doc.chapters[0]!);
    expect(text).toContain("Ch01");
    expect(text).toContain("Will Mara break the silence?");
    expect(text).toContain("Breakfast table");
  });
});
