import { describe, expect, it } from "vitest";
import { notesForEditorAnchor, type LineNote } from "./notes.js";

describe("notesForEditorAnchor", () => {
  const notes: LineNote[] = [
    {
      id: "n1",
      anchorId: "Ch01.md:p:001",
      type: "comment",
      text: "Paragraph note",
      created: "2026-05-17T10:00:00Z",
    },
    {
      id: "n2",
      anchorId: "Ch01.md@12:20",
      type: "todo",
      text: "Word note",
      created: "2026-05-17T10:01:00Z",
      target: {
        file: "Ch01.md",
        from: 12,
        to: 20,
        excerpt: "harbour",
      },
    },
  ];

  it("finds notes by paragraph anchor id", () => {
    expect(
      notesForEditorAnchor(notes, {
        file: "Ch01.md",
        from: 0,
        to: 8,
        anchorId: "Ch01.md:p:001",
      }).map((n) => n.id),
    ).toEqual(["n1"]);
  });

  it("finds notes whose target range overlaps the query range", () => {
    expect(
      notesForEditorAnchor(notes, {
        file: "Ch01.md",
        from: 15,
        to: 18,
      }).map((n) => n.id),
    ).toEqual(["n2"]);
  });
});
