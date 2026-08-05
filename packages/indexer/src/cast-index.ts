import type { ChapterPair } from "./chapter-pairing.js";
import { countWords } from "./word-target.js";

export interface CharacterDefinition {
  id: string;
  name: string;
  aliases: string[];
  biblePath: string;
  bibleExcerpt: string;
}

export interface CastAppearance {
  chapterKey: string;
  draftPath: string;
  mentionCount: number;
  draftWordCount: number;
}

export interface CastMention {
  chapterKey: string;
  draftPath: string;
  offset: number;
  snippet: string;
}

export interface CastDialogue {
  chapterKey: string;
  draftPath: string;
  quote: string;
  line: string;
}

export interface CastCharacter {
  id: string;
  name: string;
  aliases: string[];
  biblePath: string;
  bibleExcerpt: string;
  appearances: CastAppearance[];
  mentions: CastMention[];
  dialogue: CastDialogue[];
}

export interface CastIndex {
  characters: CastCharacter[];
  lookup(term: string): CastCharacter | undefined;
  charactersInChapter(chapterKey: string): CastCharacter[];
}

export interface CastIndexInput {
  characterFiles: Map<string, string>;
  pairs: ChapterPair[];
  draftContents: Record<string, string>;
}

const ALIAS_RE = /also known as:\s*(.+)/i;
const SECTION_HEADING_RE = /^#{1,3}\s+(.+)$/m;
const CHARACTER_BIBLE_DIR = "00 Canon/Character Bible/";
const SINGLE_BIBLE_NAMES = [
  "00 Canon/Character Bible.md",
  "00 Canon/Character Bible/Character Bible.md",
];

function normaliseTerm(term: string): string {
  return term.trim().toLowerCase();
}

function slugFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function excerptFromContent(content: string): string {
  const body = content.replace(/^---[\s\S]*?---\n?/, "");
  const line = body
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find((l) => l.length > 0 && !l.startsWith("Also known as"));
  return line?.slice(0, 200) ?? "";
}

function extractAliases(content: string): string[] {
  const match = content.match(ALIAS_RE);
  if (!match) return [];
  return match[1]!
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter(Boolean);
}

function titleFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.md$/i, "");
}

function parseSingleBibleSections(
  path: string,
  content: string,
): CharacterDefinition[] {
  const defs: CharacterDefinition[] = [];
  const parts = content.split(/\n(?=###\s+)/);

  for (const part of parts) {
    const headingMatch = part.match(/^###\s+(.+?)(?:\n|$)/);
    if (!headingMatch) continue;

    const name = headingMatch[1]!.trim();
    if (!name || name.toLowerCase() === "character bible") continue;

    defs.push({
      id: slugFromName(name),
      name,
      aliases: extractAliases(part),
      biblePath: `${path}#${name}`,
      bibleExcerpt: excerptFromContent(part),
    });
  }

  return defs;
}

export function parseCharacterDefinitions(
  files: Map<string, string>,
): CharacterDefinition[] {
  const defs: CharacterDefinition[] = [];

  for (const biblePath of SINGLE_BIBLE_NAMES) {
    const content = files.get(biblePath);
    if (content) {
      defs.push(...parseSingleBibleSections(biblePath, content));
    }
  }

  for (const [path, content] of files) {
    if (!path.startsWith("00 Canon/")) continue;
    if (!path.endsWith(".md")) continue;
    if (!path.includes("Character Bible")) continue;
    if (SINGLE_BIBLE_NAMES.includes(path)) continue;

    const isPerCharacterFile =
      path.startsWith(CHARACTER_BIBLE_DIR) &&
      path.slice(CHARACTER_BIBLE_DIR.length).includes("/") === false;

    if (!isPerCharacterFile) continue;

    const headingMatch = content.match(SECTION_HEADING_RE);
    const name = headingMatch?.[1]?.trim() ?? titleFromPath(path);

    defs.push({
      id: slugFromName(name),
      name,
      aliases: extractAliases(content),
      biblePath: path,
      bibleExcerpt: excerptFromContent(content),
    });
  }

  const byId = new Map<string, CharacterDefinition>();
  for (const def of defs) {
    byId.set(def.id, def);
  }
  return [...byId.values()];
}

type NameNeedle = { needle: string; def: CharacterDefinition };

function buildNameNeedles(defs: CharacterDefinition[]): NameNeedle[] {
  const needles: NameNeedle[] = [];
  for (const def of defs) {
    for (const name of [def.name, ...def.aliases]) {
      needles.push({ needle: name.toLowerCase(), def });
    }
  }
  needles.sort((a, b) => b.needle.length - a.needle.length);
  return needles;
}

function snippetAround(text: string, offset: number, radius = 60): string {
  const start = Math.max(0, offset - radius);
  const end = Math.min(text.length, offset + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function findMentions(
  text: string,
  needles: NameNeedle[],
): { def: CharacterDefinition; offset: number }[] {
  const lower = text.toLowerCase();
  const found: { def: CharacterDefinition; offset: number }[] = [];
  const used = new Set<string>();

  for (const { needle, def } of needles) {
    let from = 0;
    while (from < lower.length) {
      const idx = lower.indexOf(needle, from);
      if (idx === -1) break;

      const before = idx > 0 ? lower[idx - 1]! : " ";
      const after =
        idx + needle.length < lower.length ? lower[idx + needle.length]! : " ";
      const wordChar = /[a-z'-]/i;
      if (wordChar.test(before) || wordChar.test(after)) {
        from = idx + 1;
        continue;
      }

      const key = `${def.id}:${idx}`;
      if (!used.has(key)) {
        used.add(key);
        found.push({ def, offset: idx });
      }
      from = idx + needle.length;
    }
  }

  return found.sort((a, b) => a.offset - b.offset);
}

const QUOTED_SPEECH_RE = /"([^"]{1,500})"/g;
const SAID_PATTERN_RE =
  /(?:"([^"]{1,500})"[^.\n]{0,80}\b(said|asked|whispered|replied|answered)\s+([A-Za-z][A-Za-z'-]*))|(?:\b([A-Za-z][A-Za-z'-]*)\s+(said|asked|whispered|replied|answered)[^.\n]{0,40}"([^"]{1,500})")/gi;
const PRONOUN_SAID_RE =
  /\b(She|He|They)\s+(?:also\s+)?(?:said|asked|whispered|replied|answered)[^"]*"([^"]{1,500})"/gi;

function extractDialogue(
  text: string,
  chapterKey: string,
  draftPath: string,
  defs: CharacterDefinition[],
): Map<string, CastDialogue[]> {
  const byCharacter = new Map<string, CastDialogue[]>();
  const nameToDef = new Map<string, CharacterDefinition>();
  for (const def of defs) {
    nameToDef.set(normaliseTerm(def.name), def);
    for (const alias of def.aliases) {
      nameToDef.set(normaliseTerm(alias), def);
    }
  }

  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;

    for (const match of line.matchAll(SAID_PATTERN_RE)) {
      const quote = match[1] ?? match[6];
      const speaker = match[3] ?? match[4];
      if (!quote || !speaker) continue;
      const def = nameToDef.get(normaliseTerm(speaker));
      if (!def) continue;
      const list = byCharacter.get(def.id) ?? [];
      list.push({ chapterKey, draftPath, quote, line: line.trim() });
      byCharacter.set(def.id, list);
    }

    for (const match of line.matchAll(PRONOUN_SAID_RE)) {
      const quote = match[2]!;
      const nearby = lines.slice(Math.max(0, i - 4), i + 1).join(" ");
      for (const def of defs) {
        const names = [def.name, ...def.aliases];
        if (!names.some((n) => new RegExp(`\\b${escapeRegExp(n)}\\b`, "i").test(nearby))) {
          continue;
        }
        const list = byCharacter.get(def.id) ?? [];
        if (list.some((d) => d.quote === quote && d.line === line.trim())) break;
        list.push({ chapterKey, draftPath, quote, line: line.trim() });
        byCharacter.set(def.id, list);
        break;
      }
    }

    for (const match of line.matchAll(QUOTED_SPEECH_RE)) {
      const quote = match[1]!;
      const nearby = lines.slice(Math.max(0, i - 4), i + 2).join(" ");
      const context = nearby;
      for (const def of defs) {
        const names = [def.name, ...def.aliases];
        const hit = names.some((n) =>
          new RegExp(`\\b${escapeRegExp(n)}\\b`, "i").test(context),
        );
        if (!hit) continue;
        const existing = byCharacter.get(def.id) ?? [];
        if (existing.some((d) => d.quote === quote && d.line === line.trim())) {
          continue;
        }
        existing.push({ chapterKey, draftPath, quote, line: line.trim() });
        byCharacter.set(def.id, existing);
        break;
      }
    }
  }

  return byCharacter;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildCastIndex(input: CastIndexInput): CastIndex {
  const defs = parseCharacterDefinitions(input.characterFiles);
  const needles = buildNameNeedles(defs);

  const mentionMap = new Map<string, CastMention[]>();
  const appearanceMap = new Map<string, Map<string, CastAppearance>>();
  const dialogueMap = new Map<string, CastDialogue[]>();

  for (const pair of input.pairs) {
    if (!pair.draft) continue;
    const text = input.draftContents[pair.draft] ?? "";
    if (!text) continue;

    const mentions = findMentions(text, needles);
    const chapterDialogue = extractDialogue(
      text,
      pair.key,
      pair.draft,
      defs,
    );

    for (const [id, lines] of chapterDialogue) {
      const existing = dialogueMap.get(id) ?? [];
      dialogueMap.set(id, [...existing, ...lines]);
    }

    const counts = new Map<string, number>();
    for (const { def, offset } of mentions) {
      counts.set(def.id, (counts.get(def.id) ?? 0) + 1);
      const list = mentionMap.get(def.id) ?? [];
      list.push({
        chapterKey: pair.key,
        draftPath: pair.draft,
        offset,
        snippet: snippetAround(text, offset),
      });
      mentionMap.set(def.id, list);
    }

    for (const [id, count] of counts) {
      const byChapter = appearanceMap.get(id) ?? new Map();
      byChapter.set(pair.key, {
        chapterKey: pair.key,
        draftPath: pair.draft,
        mentionCount: count,
        draftWordCount: countWords(text),
      });
      appearanceMap.set(id, byChapter);
    }
  }

  const characters: CastCharacter[] = defs.map((def) => ({
    ...def,
    appearances: [...(appearanceMap.get(def.id)?.values() ?? [])],
    mentions: mentionMap.get(def.id) ?? [],
    dialogue: dialogueMap.get(def.id) ?? [],
  }));

  const byTerm = new Map<string, CastCharacter>();
  for (const character of characters) {
    byTerm.set(normaliseTerm(character.name), character);
    for (const alias of character.aliases) {
      byTerm.set(normaliseTerm(alias), character);
    }
  }

  return {
    characters,

    lookup(term: string) {
      return byTerm.get(normaliseTerm(term));
    },

    charactersInChapter(chapterKey: string) {
      return characters.filter((c) =>
        c.appearances.some((a) => a.chapterKey === chapterKey),
      );
    },
  };
}

export function castCharactersForBookIndex(
  index: CastIndex,
): CastCharacter[] {
  return index.characters;
}
