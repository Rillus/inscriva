import { parseParagraphs } from "@inscriva/indexer";

export type EditorSelection = {
  from: number;
  to: number;
  text: string;
};

export type EditorCaret = {
  from: number;
  to: number;
};

export type EditorSelectionChange = {
  caret: EditorCaret;
  selection: EditorSelection | null;
};

export function normaliseSelectionText(text: string): string {
  return text.replace(/\r\n/g, "\n").trim();
}

export function readEditorSelection(
  doc: string,
  from: number,
  to: number,
): EditorSelection | null {
  if (from === to) return null;
  const text = normaliseSelectionText(doc.slice(from, to));
  if (!text) return null;
  return { from, to, text };
}

export function paragraphIndexContainingOffset(
  content: string,
  offset: number,
): number | undefined {
  const paragraphs = parseParagraphs(content);
  if (paragraphs.length === 0) return undefined;

  let searchFrom = 0;
  for (const paragraph of paragraphs) {
    const start = content.indexOf(paragraph.text, searchFrom);
    if (start === -1) continue;
    const end = start + paragraph.text.length;
    if (offset >= start && offset <= end) return paragraph.index;
    searchFrom = end;
  }

  return paragraphs[0]?.index;
}

export function paragraphIndexFromAnchorId(anchorId: string): number | undefined {
  const sidecarMatch = anchorId.match(/:p:(\d+)$/);
  if (sidecarMatch) return Number(sidecarMatch[1]) - 1;

  const legacyMatch = anchorId.match(/^anchor-(\d+)$/);
  if (legacyMatch) return Number(legacyMatch[1]);

  return undefined;
}

/** Last markdown `##` heading before `offset`, if any. */
export function sceneHeadingBeforeOffset(
  content: string,
  offset: number,
): string | undefined {
  const before = content.slice(0, offset);
  const matches = [...before.matchAll(/^##\s+(.+)$/gm)];
  return matches.at(-1)?.[1]?.trim();
}

/** Paragraph text containing `offset`. */
export function draftExcerptAtOffset(
  content: string,
  offset: number,
): string | undefined {
  const paragraphs = parseParagraphs(content);
  if (paragraphs.length === 0) return undefined;

  const index = paragraphIndexContainingOffset(content, offset);
  if (index === undefined) return undefined;
  return paragraphs.find((p) => p.index === index)?.text;
}

export function draftExcerptForAssist(
  content: string,
  selection: EditorSelection | null,
  activeAnchorId?: string,
): string | undefined {
  const paragraphs = parseParagraphs(content);
  if (paragraphs.length === 0) return undefined;

  if (selection) {
    return draftExcerptAtOffset(content, selection.from);
  }

  let index: number | undefined;
  if (activeAnchorId) {
    index = paragraphIndexFromAnchorId(activeAnchorId);
  }

  if (index === undefined) return undefined;
  return paragraphs.find((p) => p.index === index)?.text;
}
