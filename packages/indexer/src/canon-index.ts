export interface CanonEntry {
  path: string;
  title: string;
  aliases: string[];
  excerpt: string;
  links: string[];
}

export interface CanonIndex {
  entries: CanonEntry[];
  lookup(term: string): CanonEntry | undefined;
  termsInText(text: string): CanonEntry[];
  autocomplete(prefix: string): CanonEntry[];
}

const WIKILINK_RE = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
const ALIAS_RE = /also known as:\s*(.+)/i;

function normaliseTerm(term: string): string {
  return term.trim().toLowerCase();
}

function titleFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  return base.replace(/\.md$/i, "");
}

function excerptFromContent(content: string): string {
  const body = content.replace(/^---[\s\S]*?---\n?/, "");
  const line = body
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find((l) => l.length > 0 && !l.startsWith("["));
  return line?.slice(0, 200) ?? "";
}

function extractWikilinks(content: string): string[] {
  const links = new Set<string>();
  for (const match of content.matchAll(WIKILINK_RE)) {
    links.add(match[1]!.trim());
  }
  return [...links];
}

function extractAliases(content: string): string[] {
  const match = content.match(ALIAS_RE);
  if (!match) return [];
  return match[1]!
    .split(/[,;]/)
    .map((a) => a.trim())
    .filter(Boolean);
}

type TextNeedle = { needle: string; entry: CanonEntry };

export function buildCanonIndex(
  files: Map<string, string>,
): CanonIndex {
  const entries: CanonEntry[] = [];
  const byTerm = new Map<string, CanonEntry>();
  const textNeedles: TextNeedle[] = [];

  for (const [path, content] of files) {
    if (!path.startsWith("00 Canon/") && !path.startsWith("00 Canon\\")) {
      continue;
    }
    if (!path.endsWith(".md")) continue;

    const title = titleFromPath(path);
    const entry: CanonEntry = {
      path,
      title,
      aliases: extractAliases(content),
      excerpt: excerptFromContent(content),
      links: extractWikilinks(content),
    };
    entries.push(entry);

    byTerm.set(normaliseTerm(title), entry);
    for (const alias of entry.aliases) {
      byTerm.set(normaliseTerm(alias), entry);
    }
    for (const name of [entry.title, ...entry.aliases]) {
      textNeedles.push({ needle: name.toLowerCase(), entry });
    }
  }

  textNeedles.sort((a, b) => b.needle.length - a.needle.length);

  return {
    entries,

    lookup(term: string) {
      return byTerm.get(normaliseTerm(term));
    },

    termsInText(text: string) {
      const lower = text.toLowerCase();
      const found = new Set<CanonEntry>();
      for (const { needle, entry } of textNeedles) {
        if (lower.includes(needle)) found.add(entry);
      }
      return [...found];
    },

    autocomplete(prefix: string) {
      const p = normaliseTerm(prefix);
      if (!p) return entries.slice(0, 10);
      return entries
        .filter(
          (e) =>
            normaliseTerm(e.title).startsWith(p) ||
            e.aliases.some((a) => normaliseTerm(a).startsWith(p)),
        )
        .slice(0, 10);
    },
  };
}
