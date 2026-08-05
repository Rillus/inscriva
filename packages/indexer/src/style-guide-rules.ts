export type StyleGuideRuleKind = "forbid" | "prefer";

export interface StyleGuideRule {
  id: string;
  kind: StyleGuideRuleKind;
  phrase: string;
  label: string;
}

export interface StyleGuideViolation {
  ruleId: string;
  phrase: string;
  kind: StyleGuideRuleKind;
  excerpt: string;
  offset: number;
}

const SECTION_FORBID_RE = /^##\s+(Avoid|Do not|Don't|NOT)\s*$/i;
const SECTION_PREFER_RE = /^##\s+(Prefer|Voice|POV)\s*$/i;
const BULLET_RE = /^[-*]\s+(.+)$/;

function slugId(phrase: string): string {
  return phrase
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function excerptAround(text: string, offset: number, radius = 40): string {
  const start = Math.max(0, offset - radius);
  const end = Math.min(text.length, offset + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

export function parseStyleGuideRules(styleGuideMarkdown: string): StyleGuideRule[] {
  const rules: StyleGuideRule[] = [];
  let section: StyleGuideRuleKind | null = null;

  for (const line of styleGuideMarkdown.split("\n")) {
    if (SECTION_FORBID_RE.test(line.trim())) {
      section = "forbid";
      continue;
    }
    if (SECTION_PREFER_RE.test(line.trim())) {
      section = "prefer";
      continue;
    }
    if (/^##\s+/.test(line.trim())) {
      section = null;
      continue;
    }

    const bullet = line.match(BULLET_RE);
    if (!bullet || !section) continue;

    const phrase = bullet[1]!
      .replace(/^["']|["']$/g, "")
      .trim();
    if (!phrase) continue;

    rules.push({
      id: slugId(phrase) || `rule-${rules.length}`,
      kind: section,
      phrase,
      label: phrase,
    });
  }

  return rules;
}

function findPhraseViolations(
  text: string,
  phrase: string,
  rule: StyleGuideRule,
): StyleGuideViolation[] {
  const violations: StyleGuideViolation[] = [];
  const lower = text.toLowerCase();
  const needle = phrase.toLowerCase();

  if (needle === "adverbs") {
    const adverbRe = /\b[a-z]{3,}ly\b/gi;
    let match: RegExpExecArray | null;
    while ((match = adverbRe.exec(text))) {
      violations.push({
        ruleId: rule.id,
        phrase: match[0]!,
        kind: rule.kind,
        offset: match.index,
        excerpt: excerptAround(text, match.index),
      });
    }
    return violations;
  }

  let from = 0;
  while (from < lower.length) {
    const idx = lower.indexOf(needle, from);
    if (idx === -1) break;
    const before = idx > 0 ? lower[idx - 1]! : " ";
    const after =
      idx + needle.length < lower.length ? lower[idx + needle.length]! : " ";
    const wordChar = /[a-z'-]/i;
    if (!wordChar.test(before) && !wordChar.test(after)) {
      violations.push({
        ruleId: rule.id,
        phrase,
        kind: rule.kind,
        offset: idx,
        excerpt: excerptAround(text, idx),
      });
    }
    from = idx + needle.length;
  }

  return violations;
}

export function checkStyleGuideViolations(
  draftMarkdown: string,
  rules: StyleGuideRule[],
): StyleGuideViolation[] {
  const forbidRules = rules.filter((r) => r.kind === "forbid");
  const seen = new Set<string>();
  const violations: StyleGuideViolation[] = [];

  for (const rule of forbidRules) {
    for (const hit of findPhraseViolations(draftMarkdown, rule.phrase, rule)) {
      const key = `${hit.ruleId}:${hit.offset}:${hit.phrase}`;
      if (seen.has(key)) continue;
      seen.add(key);
      violations.push(hit);
    }
  }

  return violations.sort((a, b) => a.offset - b.offset);
}

export function findStyleGuidePath(filePaths: string[]): string | undefined {
  return filePaths.find(
    (p) =>
      p === "00 Canon/Style Guide.md" ||
      p.endsWith("/Style Guide.md") ||
      p.endsWith("\\Style Guide.md"),
  );
}
