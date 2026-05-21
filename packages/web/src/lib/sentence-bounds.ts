/** Sentence-ending punctuation, optionally followed by closing quotes. */
const SENTENCE_END_RE = /[.!?]["')]*$/;

/**
 * Index after the last completed sentence that ends at or before `end` (exclusive),
 * scanning only `doc.slice(0, end)`.
 */
export function sentenceStartBefore(doc: string, end: number): number {
  const before = doc.slice(0, end);
  const boundaryRe = /[.!?]["')]*(?:\s+|\n+)/g;
  let lastEnd = 0;
  let match: RegExpExecArray | null;
  while ((match = boundaryRe.exec(before)) !== null) {
    lastEnd = match.index + match[0].length;
  }
  return lastEnd;
}

function hasContentAfterOnLine(doc: string, pos: number): boolean {
  const lineBreak = doc.indexOf("\n", pos);
  const lineEnd = lineBreak === -1 ? doc.length : lineBreak;
  return doc.slice(pos, lineEnd).trim().length > 0;
}

/** Bounds of the sentence that ends at `pos`. Returns null when not at a sentence end. */
export function sentenceBoundsAt(
  doc: string,
  pos: number,
): { from: number; to: number } | null {
  if (pos <= 0 || pos > doc.length) return null;
  if (hasContentAfterOnLine(doc, pos)) return null;

  const trimmedEnd = doc.slice(0, pos).trimEnd();
  if (!trimmedEnd || !SENTENCE_END_RE.test(trimmedEnd)) return null;

  const from = sentenceStartBefore(doc, trimmedEnd.length);
  const sentence = doc.slice(from, trimmedEnd.length).trim();
  if (!sentence || !SENTENCE_END_RE.test(sentence)) return null;

  return { from, to: pos };
}

/** Plain text of the sentence ending at `pos`. */
export function sentenceTextAt(doc: string, pos: number): string | null {
  const bounds = sentenceBoundsAt(doc, pos);
  if (!bounds) return null;
  const text = doc.slice(bounds.from, bounds.to).trim();
  return text || null;
}

/**
 * True when a collapsed caret at `pos` sits at the end of a completed sentence
 * (after `.`, `!`, or `?`, optional closing quotes, and only whitespace before the caret).
 */
export function isAtSentenceEnd(doc: string, pos: number): boolean {
  return sentenceBoundsAt(doc, pos) !== null;
}
