import { describe, expect, it } from "vitest";
import { formatExpandOutlineContext } from "./expand-outline-context.js";

describe("formatExpandOutlineContext", () => {
  it("includes format guide and chapter beat", () => {
    const text = formatExpandOutlineContext({
      entry: {
        key: "Ch01",
        title: "Breakfast",
        storyQuestion: "Who is Cole?",
        scenes: ["Morning rush"],
        mustInclude: [],
        notList: [],
        continuity: [],
        body: "Notes",
      },
    });
    expect(text).toContain("## Story question");
    expect(text).toContain("Who is Cole?");
    expect(text).toContain("Ch01");
  });
});
