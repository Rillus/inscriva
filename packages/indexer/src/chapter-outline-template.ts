import type { MasterChapterEntry } from "./master-outline-parse.js";

/** Sections Inscriva parses on chapter outlines (keep headings exact). */
export const CHAPTER_OUTLINE_SECTIONS = [
  "Status",
  "Story question",
  "Turn",
  "Scenes",
  "Must include",
  "NOT",
  "Word target",
  "Continuity",
] as const;

export const CHAPTER_OUTLINE_FORMAT_GUIDE = `Chapter outlines use these exact ## headings (Inscriva reads them automatically):

## Status
Drafting | Approved | Completed

## Story question
One line.

## Turn
One line (payoff by chapter end).

## Scenes
- Bullet per scene beat (prose labels are fine)

## Must include
- Concrete items to hit

## NOT
- Exclusions

## Word target
2400

## Continuity
- Plants and links`;

export const MASTER_OUTLINE_FORMAT_GUIDE = `Book outline (Master Outline.md) — one block per chapter:

## Ch01 — Working title
**Story question:** …
**Turn:** …
**Word target:** 2400

## Scenes
- Beat one
- Beat two

## Must include
- Item

## NOT
- Exclusion

## Continuity
- Plant or link

Repeat ## Ch02 — … for each chapter. Headings must start with ChNN.`;

export function defaultChapterOutlinePath(entry: MasterChapterEntry): string {
  const safeTitle = entry.title.replace(/[/\\]+/g, "-").trim() || entry.key;
  return `01 Outlines/Chapter Outlines/${entry.key} - ${safeTitle}.md`;
}

export function buildChapterOutlineSkeleton(entry: MasterChapterEntry): string {
  const lines: string[] = [
    "---",
    `chapter: ${entry.key}`,
    "---",
    "",
    `# ${entry.key} — ${entry.title}`,
    "",
    "## Status",
    "Drafting",
    "",
  ];

  if (entry.storyQuestion) {
    lines.push("## Story question", entry.storyQuestion, "");
  }
  if (entry.turn) {
    lines.push("## Turn", entry.turn, "");
  }

  lines.push("## Scenes");
  if (entry.scenes.length) {
    for (const s of entry.scenes) lines.push(`- ${s}`);
  } else {
    lines.push("- ");
  }
  lines.push("");

  if (entry.mustInclude.length) {
    lines.push("## Must include");
    for (const s of entry.mustInclude) lines.push(`- ${s}`);
    lines.push("");
  }

  if (entry.notList.length) {
    lines.push("## NOT");
    for (const s of entry.notList) lines.push(`- ${s}`);
    lines.push("");
  }

  if (entry.wordTarget) {
    lines.push("## Word target", entry.wordTarget, "");
  }

  if (entry.continuity.length) {
    lines.push("## Continuity");
    for (const s of entry.continuity) lines.push(`- ${s}`);
    lines.push("");
  }

  return `${lines.join("\n").trimEnd()}\n`;
}

/** Prefer Assist output when it looks like a full outline; otherwise merge into skeleton. */
export function applyExpandedChapterOutline(
  existing: string | undefined,
  expanded: string,
  entry: MasterChapterEntry,
): string {
  const trimmed = expanded.trim();
  const hasOutlineShape =
    /^#\s+Ch\d+/im.test(trimmed) &&
    /^##\s+Story question/im.test(trimmed) &&
    /^##\s+Scenes/im.test(trimmed);

  if (hasOutlineShape) {
    if (!/^---\n/m.test(trimmed)) {
      return `---\nchapter: ${entry.key}\n---\n\n${trimmed}\n`;
    }
    return trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
  }

  const base =
    existing?.trim() && existing.trim().length > 80
      ? existing
      : buildChapterOutlineSkeleton(entry);

  const scenesBlock = trimmed.match(/^##\s+Scenes[\s\S]*?(?=^##\s|(?![\s\S]))/im);
  if (scenesBlock) {
    return base.replace(
      /^##\s+Scenes[\s\S]*?(?=^##\s|(?![\s\S]))/im,
      scenesBlock[0]!.trimEnd() + "\n\n",
    );
  }

  return `${base.trimEnd()}\n\n${trimmed}\n`;
}
