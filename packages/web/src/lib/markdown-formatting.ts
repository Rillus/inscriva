import { EditorSelection, type EditorState, type StateCommand } from "@codemirror/state";
import { syntaxTree } from "@codemirror/language";
import type { EditorView } from "@codemirror/view";
import {
  delimitedMarkRanges,
  isInCodeContext,
  syntaxNodeAtSpan,
  type InlineMarkRanges,
} from "./markdown-syntax.js";

export type { InlineMarkRanges };

export function rangeOverlaps(
  aFrom: number,
  aTo: number,
  bFrom: number,
  bTo: number,
): boolean {
  return aFrom < bTo && bFrom < aTo;
}

export function wordBoundsInDoc(
  doc: string,
  pos: number,
): { from: number; to: number } {
  const re = /[A-Za-z0-9][A-Za-z0-9'\-]*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(doc))) {
    const from = match.index;
    const to = from + match[0].length;
    if (pos >= from && pos <= to) return { from, to };
  }
  return { from: pos, to: pos };
}

export function wrapRangeWithMarkers(
  text: string,
  from: number,
  to: number,
  marker: string,
): { text: string; selectionFrom: number; selectionTo: number } {
  const slice = text.slice(from, to);
  const wrapped = `${marker}${slice}${marker}`;
  return {
    text: text.slice(0, from) + wrapped + text.slice(to),
    selectionFrom: from + marker.length,
    selectionTo: to + marker.length,
  };
}

export function unwrapInlineMarkers(
  text: string,
  openFrom: number,
  openTo: number,
  closeFrom: number,
  closeTo: number,
): { text: string; selectionFrom: number; selectionTo: number } {
  const withoutClose = text.slice(0, closeFrom) + text.slice(closeTo);
  const withoutBoth =
    withoutClose.slice(0, openFrom) + withoutClose.slice(openTo);
  const contentLength = closeFrom - openTo;
  return {
    text: withoutBoth,
    selectionFrom: openFrom,
    selectionTo: openFrom + contentLength,
  };
}

function selectionBounds(state: EditorState): { from: number; to: number } {
  const main = state.selection.main;
  if (main.from !== main.to) return { from: main.from, to: main.to };
  return wordBoundsInDoc(state.doc.toString(), main.head);
}

function findInlineFormatNode(
  state: EditorState,
  from: number,
  to: number,
  name: "Emphasis" | "StrongEmphasis",
): { from: number; to: number; name: "Emphasis" | "StrongEmphasis" } | null {
  let found: { from: number; to: number; name: "Emphasis" | "StrongEmphasis" } | null =
    null;
  syntaxTree(state).iterate({
    from,
    to,
    enter(node) {
      if (node.name !== name) return;
      if (isInCodeContext(state, node.from)) return;
      if (node.from <= from && node.to >= to) {
        found = { from: node.from, to: node.to, name };
      }
    },
  });
  return found;
}

function toggleInlineFormat(
  marker: string,
  nodeName: "Emphasis" | "StrongEmphasis",
): StateCommand {
  return ({ state, dispatch }) => {
    const { from, to } = selectionBounds(state);
    if (from === to) return false;

    const existing = findInlineFormatNode(state, from, to, nodeName);

    if (existing) {
      const syn = syntaxNodeAtSpan(
        state,
        existing.from,
        existing.to,
        existing.name,
      );
      const marks = syn ? delimitedMarkRanges(syn, "EmphasisMark") : null;
      if (!marks) return false;
      dispatch(
        state.update({
          changes: [
            { from: marks.closeFrom, to: marks.closeTo, insert: "" },
            { from: marks.openFrom, to: marks.openTo, insert: "" },
          ],
          selection: EditorSelection.range(
            marks.openFrom,
            marks.openFrom + (marks.contentTo - marks.contentFrom),
          ),
        }),
      );
      return true;
    }

    const slice = state.sliceDoc(from, to);
    dispatch(
      state.update({
        changes: { from, to, insert: `${marker}${slice}${marker}` },
        selection: EditorSelection.range(
          from + marker.length,
          to + marker.length,
        ),
      }),
    );
    return true;
  };
}

export const toggleBold = toggleInlineFormat("**", "StrongEmphasis");
export const toggleItalic = toggleInlineFormat("*", "Emphasis");

export function copyToClipboard(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  if (from === to) return false;
  void navigator.clipboard.writeText(view.state.sliceDoc(from, to));
  return true;
}

export function cutToClipboard(view: EditorView): boolean {
  const { from, to } = view.state.selection.main;
  if (from === to) return false;
  void navigator.clipboard.writeText(view.state.sliceDoc(from, to)).then(() => {
    view.dispatch({ changes: { from, to, insert: "" } });
  });
  return true;
}

export function pasteFromClipboard(view: EditorView): boolean {
  void navigator.clipboard.readText().then((text) => {
    if (!text) return;
    view.dispatch(view.state.replaceSelection(text));
  });
  return true;
}
