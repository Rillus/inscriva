import { normaliseChapterKey } from "./outline-parse.js";

export interface MasterChapterEntry {
  key: string;
  title: string;
  storyQuestion?: string;
  turn?: string;
  wordTarget?: string;
  scenes: string[];
  mustInclude: string[];
  notList: string[];
  continuity: string[];
  /** Raw markdown body under the chapter heading (for model context). */
  body: string;
}

export interface MasterOutlineDocument {
  chapters: MasterChapterEntry[];
}

const CHAPTER_HEADING_RE = /^##\s+(Ch\d+)\s*[—–-]\s*(.+)\s*$/gim;
const FIELD_RE =
  /^\*\*(Story question|Turn|Word target):\*\*\s*(.+)$/i;
const SECTION_HEADING_RE = /^##\s+(Scenes|Must include|NOT|Continuity)\s*$/i;

function parseBullets(lines: string[], start: number): { items: string[]; next: number } {
  const items: string[] = [];
  let i = start;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (SECTION_HEADING_RE.test(line) || line.match(/^##\s+Ch\d+/i)) break;
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (bullet) items.push(bullet[1]!.trim());
    else if (numbered) items.push(numbered[1]!.trim());
    else if (line.trim() && !line.startsWith("**")) break;
  }
  return { items, next: i };
}

function parseMasterChapterBlock(
  key: string,
  title: string,
  body: string,
): MasterChapterEntry {
  const entry: MasterChapterEntry = {
    key: normaliseChapterKey(key),
    title,
    scenes: [],
    mustInclude: [],
    notList: [],
    continuity: [],
    body: body.trim(),
  };

  const lines = body.split("\n");
  let section: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const field = line.match(FIELD_RE);
    if (field) {
      const label = field[1]!.toLowerCase();
      const value = field[2]!.trim();
      if (label === "story question") entry.storyQuestion = value;
      else if (label === "turn") entry.turn = value;
      else if (label === "word target") entry.wordTarget = value;
      section = null;
      continue;
    }

    const sectionHeading = line.match(SECTION_HEADING_RE);
    if (sectionHeading) {
      section = sectionHeading[1]!.toLowerCase();
      const { items, next } = parseBullets(lines, i + 1);
      i = next - 1;
      switch (section) {
        case "scenes":
          entry.scenes = items;
          break;
        case "must include":
          entry.mustInclude = items;
          break;
        case "not":
          entry.notList = items;
          break;
        case "continuity":
          entry.continuity = items;
          break;
      }
      section = null;
      continue;
    }

    if (!section || !line.trim()) continue;
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    const value = bullet?.[1]?.trim() ?? numbered?.[1]?.trim();
    if (!value) continue;
    switch (section) {
      case "scenes":
        entry.scenes.push(value);
        break;
      case "must include":
        entry.mustInclude.push(value);
        break;
      case "not":
        entry.notList.push(value);
        break;
      case "continuity":
        entry.continuity.push(value);
        break;
    }
  }

  return entry;
}

export function parseMasterOutline(markdown: string): MasterOutlineDocument {
  const chapters: MasterChapterEntry[] = [];
  const matches = [...markdown.matchAll(CHAPTER_HEADING_RE)];

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i]!;
    const start = m.index! + m[0].length;
    const end = matches[i + 1]?.index ?? markdown.length;
    const body = markdown.slice(start, end);
    chapters.push(
      parseMasterChapterBlock(m[1]!, m[2]!.trim(), body),
    );
  }

  return { chapters };
}

export function findMasterChapterAtOffset(
  markdown: string,
  offset: number,
): MasterChapterEntry | null {
  const doc = parseMasterOutline(markdown);
  if (!doc.chapters.length) return null;

  const positions: { index: number; entry: MasterChapterEntry }[] = [];
  for (const entry of doc.chapters) {
    const re = new RegExp(
      `^##\\s+${entry.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*[—–-]`,
      "im",
    );
    const match = re.exec(markdown);
    if (match?.index !== undefined) {
      positions.push({ index: match.index, entry });
    }
  }

  positions.sort((a, b) => a.index - b.index);
  let current: MasterChapterEntry | null = null;
  for (const pos of positions) {
    if (pos.index <= offset) current = pos.entry;
    else break;
  }
  return current;
}

export function formatMasterChapterForContext(entry: MasterChapterEntry): string {
  const lines: string[] = [
    `**Book outline chapter:** ${entry.key} — ${entry.title}`,
  ];
  if (entry.storyQuestion) {
    lines.push(`**Story question:** ${entry.storyQuestion}`);
  }
  if (entry.turn) lines.push(`**Turn:** ${entry.turn}`);
  if (entry.wordTarget) lines.push(`**Word target:** ${entry.wordTarget}`);
  if (entry.scenes.length) {
    lines.push("**Scenes (from book outline):**");
    for (const s of entry.scenes) lines.push(`- ${s}`);
  }
  if (entry.mustInclude.length) {
    lines.push("**Must include:**");
    for (const s of entry.mustInclude) lines.push(`- ${s}`);
  }
  if (entry.notList.length) {
    lines.push("**NOT:**");
    for (const s of entry.notList) lines.push(`- ${s}`);
  }
  if (entry.continuity.length) {
    lines.push("**Continuity:**");
    for (const s of entry.continuity) lines.push(`- ${s}`);
  }
  lines.push("", "**Full book-outline excerpt:**", entry.body);
  return lines.join("\n");
}
