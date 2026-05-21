import type { NoteTarget, NoteType } from "@inscriva/indexer";
import { paragraphIndexContainingOffset } from "./editor-selection.js";
import { sentenceBoundsAt } from "./sentence-bounds.js";
import type { WriteWithAiAnchor } from "./write-with-ai-context.js";

export function noteTargetFromAnchor(
  doc: string,
  file: string,
  anchor: WriteWithAiAnchor,
): NoteTarget {
  if (anchor.kind === "selection") {
    return {
      file,
      from: anchor.from,
      to: anchor.to,
      excerpt: anchor.text,
    };
  }

  const bounds = sentenceBoundsAt(doc, anchor.from);
  if (bounds) {
    const excerpt = doc.slice(bounds.from, bounds.to).trim();
    return { file, from: bounds.from, to: bounds.to, excerpt };
  }

  return { file, from: anchor.from, to: anchor.to, excerpt: anchor.text };
}

export function paragraphAnchorIdForOffset(
  file: string,
  content: string,
  offset: number,
): string | undefined {
  const index = paragraphIndexContainingOffset(content, offset);
  if (index === undefined) return undefined;
  return `${file}:p:${String(index + 1).padStart(3, "0")}`;
}

export function buildLineNote(input: {
  text: string;
  type: NoteType;
  target: NoteTarget;
  paragraphAnchorId?: string;
}): import("@inscriva/indexer").LineNote {
  const anchorId =
    input.paragraphAnchorId ??
    `${input.target.file}@${input.target.from}:${input.target.to}`;

  return {
    id: `n-${Date.now()}`,
    anchorId,
    type: input.type,
    text: input.text.trim(),
    created: new Date().toISOString(),
    target: input.target,
  };
}
