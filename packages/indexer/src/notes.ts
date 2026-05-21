export type NoteType =
  | "comment"
  | "continuity"
  | "voice"
  | "plant"
  | "todo"
  | "ai";

export interface NoteTarget {
  file: string;
  from: number;
  to: number;
  excerpt: string;
}

export interface LineNote {
  id: string;
  anchorId: string;
  type: NoteType;
  text: string;
  created: string;
  /** Character range in `file` when the note is not only paragraph-scoped. */
  target?: NoteTarget;
}

export function parseNotesJsonl(raw: string): LineNote[] {
  if (!raw.trim()) return [];

  return raw
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as LineNote);
}

export function notesForAnchor(notes: LineNote[], anchorId: string): LineNote[] {
  return notes.filter((n) => n.anchorId === anchorId);
}

function rangesOverlap(
  aFrom: number,
  aTo: number,
  bFrom: number,
  bTo: number,
): boolean {
  return Math.max(aFrom, bFrom) < Math.min(aTo, bTo);
}

/** Notes attached to a paragraph anchor and/or overlapping a document range. */
export function notesForEditorAnchor(
  notes: LineNote[],
  ctx: { file: string; from: number; to: number; anchorId?: string },
): LineNote[] {
  return notes.filter((note) => {
    if (ctx.anchorId && note.anchorId === ctx.anchorId) return true;
    if (!note.target || note.target.file !== ctx.file) return false;
    return rangesOverlap(
      note.target.from,
      note.target.to,
      ctx.from,
      ctx.to,
    );
  });
}

export function appendNote(existing: string, note: LineNote): string {
  const line = JSON.stringify(note);
  return existing.trim() ? `${existing.trimEnd()}\n${line}` : line;
}

export function serialiseNotes(notes: LineNote[]): string {
  return notes.map((n) => JSON.stringify(n)).join("\n");
}
