import { describe, expect, it } from "vitest";
import {
  draftExcerptForAssist,
  normaliseSelectionText,
  paragraphIndexContainingOffset,
  paragraphIndexFromAnchorId,
  readEditorSelection,
} from "./editor-selection.js";

describe("normaliseSelectionText", () => {
  it("trims leading and trailing whitespace", () => {
    expect(normaliseSelectionText("  hello  ")).toBe("hello");
  });

  it("normalises CRLF to LF before trimming", () => {
    expect(normaliseSelectionText("\r\nline\r\n")).toBe("line");
  });

  it("returns empty string for whitespace-only selection", () => {
    expect(normaliseSelectionText("   \n  ")).toBe("");
  });
});

describe("readEditorSelection", () => {
  const doc = "First paragraph.\n\nSecond paragraph.";

  it("returns null for a collapsed caret", () => {
    expect(readEditorSelection(doc, 3, 3)).toBeNull();
  });

  it("returns selection with normalised text", () => {
    expect(readEditorSelection(doc, 0, 5)).toEqual({
      from: 0,
      to: 5,
      text: "First",
    });
  });

  it("returns null when selected text is only whitespace", () => {
    expect(readEditorSelection(doc, 16, 18)).toBeNull();
  });
});

describe("paragraphIndexContainingOffset", () => {
  const doc = "Alpha block.\n\nBeta block.\n\nGamma block.";

  it("finds the paragraph index for an offset inside the second block", () => {
    const betaStart = doc.indexOf("Beta");
    expect(paragraphIndexContainingOffset(doc, betaStart + 2)).toBe(1);
  });

  it("returns undefined for empty content", () => {
    expect(paragraphIndexContainingOffset("", 0)).toBeUndefined();
  });
});

describe("paragraphIndexFromAnchorId", () => {
  it("parses sidecar anchor ids", () => {
    expect(paragraphIndexFromAnchorId("02 Drafts/Ch01.md:p:002")).toBe(1);
  });

  it("parses legacy anchor ids", () => {
    expect(paragraphIndexFromAnchorId("anchor-0")).toBe(0);
  });
});

describe("draftExcerptForAssist", () => {
  const doc = "First paragraph.\n\nSecond paragraph.\n\nThird paragraph.";

  it("uses the paragraph containing the selection", () => {
    const selection = readEditorSelection(doc, doc.indexOf("Second"), doc.indexOf("Second") + 6)!;
    expect(draftExcerptForAssist(doc, selection)).toBe("Second paragraph.");
  });

  it("uses the active anchor paragraph when there is no selection", () => {
    expect(draftExcerptForAssist(doc, null, "anchor-2")).toBe("Third paragraph.");
  });

  it("returns undefined when content has no paragraphs", () => {
    expect(draftExcerptForAssist("", null)).toBeUndefined();
  });
});
