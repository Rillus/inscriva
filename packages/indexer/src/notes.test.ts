import { describe, expect, it } from "vitest";
import {
  appendNote,
  notesForAnchor,
  parseNotesJsonl,
  serialiseNotes,
  type LineNote,
} from "./notes.js";

describe("notes jsonl", () => {
  const sample = [
    '{"id":"n1","anchorId":"ch01:p:001","type":"comment","text":"Check tone","created":"2026-05-17T10:00:00Z"}',
    '{"id":"n2","anchorId":"ch01:p:001","type":"continuity","text":"Festival timeline","created":"2026-05-17T10:01:00Z"}',
    '{"id":"n3","anchorId":"ch01:p:002","type":"todo","text":"Expand scene","created":"2026-05-17T10:02:00Z"}',
  ].join("\n");

  it("parses notes from jsonl", () => {
    const notes = parseNotesJsonl(sample);
    expect(notes).toHaveLength(3);
    expect(notes[0]!.type).toBe("comment");
  });

  it("filters notes by anchor id", () => {
    const notes = parseNotesJsonl(sample);
    const forP1 = notesForAnchor(notes, "ch01:p:001");

    expect(forP1).toHaveLength(2);
    expect(forP1.map((n) => n.id)).toEqual(["n1", "n2"]);
  });

  it("appends a new note line", () => {
    const note: LineNote = {
      id: "n4",
      anchorId: "ch01:p:003",
      type: "ai",
      text: "Ask about rope",
      created: "2026-05-17T11:00:00Z",
    };
    const next = appendNote("", note);

    expect(next.trim()).toBe(JSON.stringify(note));
  });

  it("returns empty array for blank input", () => {
    expect(parseNotesJsonl("  \n  ")).toEqual([]);
  });

  it("serialises notes back to jsonl", () => {
    const notes = parseNotesJsonl(sample);
    expect(serialiseNotes(notes).split("\n")).toHaveLength(3);
  });
});
