import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";
import type { SyntaxNode } from "@lezer/common";

export type InlineMarkRanges = {
  openFrom: number;
  openTo: number;
  closeFrom: number;
  closeTo: number;
  contentFrom: number;
  contentTo: number;
};

export function syntaxNodeAtSpan(
  state: EditorState,
  from: number,
  to: number,
  name: string,
): SyntaxNode | null {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(from + 1, 1);
  while (node && (node.from !== from || node.to !== to)) {
    node = node.parent;
  }
  if (!node || node.name !== name) return null;
  return node;
}

export function delimitedMarkRanges(
  node: SyntaxNode,
  markName: string,
): InlineMarkRanges | null {
  const markNodes = node.getChildren(markName);
  if (markNodes.length < 2) return null;

  const open = markNodes[0];
  const close = markNodes[markNodes.length - 1];
  return {
    openFrom: open.from,
    openTo: open.to,
    closeFrom: close.from,
    closeTo: close.to,
    contentFrom: open.to,
    contentTo: close.from,
  };
}

export function isInCodeContext(state: EditorState, pos: number): boolean {
  let node: SyntaxNode | null = syntaxTree(state).resolveInner(pos, 1);
  for (; node; node = node.parent) {
    if (node.name === "FencedCode" || node.name === "InlineCode") return true;
  }
  return false;
}

/** @deprecated Use delimitedMarkRanges via syntaxNodeAtSpan */
export function inlineMarkRangesForSpan(
  state: EditorState,
  from: number,
  to: number,
  name: "Emphasis" | "StrongEmphasis",
): InlineMarkRanges | null {
  const node = syntaxNodeAtSpan(state, from, to, name);
  if (!node) return null;
  return delimitedMarkRanges(node, "EmphasisMark");
}

export function headingLevel(name: string): number | null {
  const atx = /^ATXHeading(\d)$/.exec(name);
  if (atx) return Number(atx[1]);
  if (name === "SetextHeading1") return 1;
  if (name === "SetextHeading2") return 2;
  return null;
}

type DocSlice = string | { sliceString(from: number, to: number): string };

function charAt(doc: DocSlice, pos: number): string {
  return typeof doc === "string" ? doc.charAt(pos) : doc.sliceString(pos, pos + 1);
}

/** First character of heading title text (skips whitespace after `#` marks). */
export function headingTitleStart(
  doc: DocSlice,
  markEnd: number,
  nodeTo: number,
): number {
  let pos = markEnd;
  while (pos < nodeTo) {
    const ch = charAt(doc, pos);
    if (ch !== " " && ch !== "\t") break;
    pos++;
  }
  return pos;
}
