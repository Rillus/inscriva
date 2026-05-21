import { describe, expect, it } from "vitest";
import {
  buildLineNote,
  noteTargetFromAnchor,
  paragraphAnchorIdForOffset,
} from "./note-target.js";

describe("noteTargetFromAnchor", () => {
  it("uses the selection range for a selection anchor", () => {
    expect(
      noteTargetFromAnchor("Hello world", "Ch01.md", {
        from: 0,
        to: 5,
        kind: "selection",
        text: "Hello",
      }),
    ).toEqual({
      file: "Ch01.md",
      from: 0,
      to: 5,
      excerpt: "Hello",
    });
  });

  it("uses the sentence range for a continue anchor", () => {
    const doc = "First.\n\nThe rain stopped.";
    const pos = doc.length;
    expect(
      noteTargetFromAnchor(doc, "Ch01.md", {
        from: pos,
        to: pos,
        kind: "continue",
        text: "The rain stopped.",
      }),
    ).toMatchObject({
      file: "Ch01.md",
      excerpt: "The rain stopped.",
    });
  });
});

describe("paragraphAnchorIdForOffset", () => {
  it("builds a sidecar-style anchor id", () => {
    const doc = "One.\n\nTwo.\n\nThree.";
    const offset = doc.indexOf("Two");
    expect(paragraphAnchorIdForOffset("02 Drafts/Ch01.md", doc, offset)).toBe(
      "02 Drafts/Ch01.md:p:002",
    );
  });
});

describe("buildLineNote", () => {
  it("stores target and paragraph anchor id", () => {
    const note = buildLineNote({
      text: "Check tone",
      type: "comment",
      target: {
        file: "Ch01.md",
        from: 0,
        to: 4,
        excerpt: "Word",
      },
      paragraphAnchorId: "Ch01.md:p:001",
    });
    expect(note.anchorId).toBe("Ch01.md:p:001");
    expect(note.target?.excerpt).toBe("Word");
  });
});
