import { describe, expect, it } from "vitest";
import type { MasterChapterEntry } from "./master-outline-parse.js";
import {
  applyExpandedChapterOutline,
  buildChapterOutlineSkeleton,
  defaultChapterOutlinePath,
} from "./chapter-outline-template.js";

const ENTRY: MasterChapterEntry = {
  key: "Ch01",
  title: "The Eighth A",
  storyQuestion: "Will Mara speak?",
  turn: "She names the cost.",
  wordTarget: "2400",
  scenes: ["Breakfast", "Tide"],
  mustInclude: ["Appledore"],
  notList: ["Backstory dump"],
  continuity: ["P03 planted"],
  body: "",
};

describe("buildChapterOutlineSkeleton", () => {
  it("uses the simple machine-readable chapter outline shape", () => {
    const md = buildChapterOutlineSkeleton(ENTRY);
    expect(md).toContain("# Ch01 — The Eighth A");
    expect(md).toContain("## Status\nDrafting");
    expect(md).toContain("## Story question");
    expect(md).toContain("Will Mara speak?");
    expect(md).toContain("## Scenes");
    expect(md).toContain("- Breakfast");
    expect(md).toContain("## Word target\n2400");
  });
});

describe("defaultChapterOutlinePath", () => {
  it("places files under Chapter Outlines", () => {
    expect(defaultChapterOutlinePath(ENTRY)).toBe(
      "01 Outlines/Chapter Outlines/Ch01 - The Eighth A.md",
    );
  });
});

describe("applyExpandedChapterOutline", () => {
  it("replaces a stub outline with expanded output", () => {
    const stub = buildChapterOutlineSkeleton(ENTRY);
    const expanded = `${stub}\n\n## Notes from Assist\nExtra beat.`;
    const next = applyExpandedChapterOutline(stub, expanded, ENTRY);
    expect(next).toContain("Extra beat");
    expect(next).toContain("## Story question");
  });
});
