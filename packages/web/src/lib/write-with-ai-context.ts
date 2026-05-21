import { normaliseSelectionText } from "./editor-selection.js";
import { isAtSentenceEnd, sentenceTextAt } from "./sentence-bounds.js";

export type WriteWithAiKind = "continue" | "selection";

export type WriteWithAiIntent = "prompt" | "expand";

export type WriteWithAiAnchor = {
  from: number;
  to: number;
  kind: WriteWithAiKind;
  text: string;
};

export function defaultIntentForSelection(text: string): WriteWithAiIntent {
  return text.length > 60 ? "expand" : "prompt";
}

/** Where the inline Write with AI affordance may appear, if anywhere. */
export function detectWriteWithAiAnchor(
  doc: string,
  from: number,
  to: number,
): WriteWithAiAnchor | null {
  if (from !== to) {
    const text = normaliseSelectionText(doc.slice(from, to));
    if (!text) return null;
    return { from, to, kind: "selection", text };
  }

  if (!isAtSentenceEnd(doc, from)) return null;
  const text = sentenceTextAt(doc, from);
  if (!text) return null;
  return { from, to: from, kind: "continue", text };
}

export function anchorStillValid(
  doc: string,
  from: number,
  to: number,
  kind: WriteWithAiKind,
): boolean {
  const next = detectWriteWithAiAnchor(doc, from, to);
  return next?.kind === kind && next.from === from && next.to === to;
}

/** After async work, the live caret must still resolve to the same anchor (avoids stale $derived reads). */
export function writeWithAiSnapshotMatchesCaret(
  doc: string,
  caretFrom: number,
  caretTo: number,
  snapshot: Pick<WriteWithAiAnchor, "from" | "to" | "kind">,
): boolean {
  const current = detectWriteWithAiAnchor(doc, caretFrom, caretTo);
  return (
    current != null &&
    current.from === snapshot.from &&
    current.to === snapshot.to &&
    current.kind === snapshot.kind
  );
}
