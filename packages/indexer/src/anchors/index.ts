
export interface Paragraph {
  index: number;
  text: string;
  fingerprint: string;
}

export interface AnchorRecord {
  id: string;
  kind: "p";
  fingerprint: string;
  preview: string;
  paragraphIndex?: number;
}

export interface AnchorSidecar {
  file: string;
  version: number;
  anchors: AnchorRecord[];
}

export type AnchorStatus = "attached" | "orphan";
export type MatchKind = "exact" | "fuzzy" | "position";

export interface ReconciledAnchor extends AnchorRecord {
  status: AnchorStatus;
  matchKind?: MatchKind;
}

export interface ReconciledSidecar extends Omit<AnchorSidecar, "anchors"> {
  anchors: ReconciledAnchor[];
}

const FUZZY_THRESHOLD = 0.82;
const PREVIEW_LENGTH = 80;

export function normaliseText(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export function fingerprint(text: string): string {
  const normalised = normaliseText(text);
  let hash = 5381;
  for (let i = 0; i < normalised.length; i++) {
    hash = (hash * 33) ^ normalised.charCodeAt(i);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function parseParagraphs(content: string): Paragraph[] {
  if (!content.trim()) return [];

  return content
    .split(/\n\s*\n/)
    .map((block) => block.trim())
    .filter((block) => block.length > 0)
    .map((text, index) => ({
      index,
      text,
      fingerprint: fingerprint(text),
    }));
}

export function previewText(text: string): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length <= PREVIEW_LENGTH
    ? oneLine
    : `${oneLine.slice(0, PREVIEW_LENGTH - 1)}…`;
}

export function buildSidecar(
  file: string,
  paragraphs: Paragraph[],
  ids: string[],
): AnchorSidecar {
  return {
    file,
    version: 1,
    anchors: paragraphs.map((p, i) => ({
      id: ids[i] ?? `anchor-${i}`,
      kind: "p" as const,
      fingerprint: p.fingerprint,
      preview: previewText(p.text),
      paragraphIndex: p.index,
    })),
  };
}

function similarity(a: string, b: string): number {
  const na = normaliseText(a);
  const nb = normaliseText(b);
  if (na === nb) return 1;
  if (!na.length || !nb.length) return 0;

  const longer = na.length >= nb.length ? na : nb;
  const shorter = na.length < nb.length ? na : nb;

  if (longer.includes(shorter) && shorter.length / longer.length >= 0.6) {
    return 0.85 + (0.14 * shorter.length) / longer.length;
  }

  const maxLen = Math.max(na.length, nb.length);
  let matches = 0;
  const window = new Set<string>();
  for (let i = 0; i < na.length; i++) {
    window.add(na.slice(i, i + 3));
  }
  for (let i = 0; i < nb.length; i++) {
    if (window.has(nb.slice(i, i + 3))) matches++;
  }

  const trigramScore = (2 * matches) / (na.length + nb.length);
  const editScore = 1 - levenshtein(na, nb) / maxLen;
  return Math.max(trigramScore, editScore);
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}

function findExactMatch(
  fp: string,
  paragraphs: Paragraph[],
  used: Set<number>,
): Paragraph | undefined {
  return paragraphs.find(
    (p) => p.fingerprint === fp && !used.has(p.index),
  );
}

function findFuzzyMatch(
  preview: string,
  paragraphs: Paragraph[],
  used: Set<number>,
  hintIndex?: number,
): { paragraph: Paragraph; score: number } | undefined {
  let best: { paragraph: Paragraph; score: number } | undefined;

  for (const p of paragraphs) {
    if (used.has(p.index)) continue;
    const score = similarity(preview, p.text);
    const positionBonus =
      hintIndex !== undefined && Math.abs(p.index - hintIndex) <= 1
        ? 0.05
        : 0;
    const adjusted = score + positionBonus;

    if (adjusted >= FUZZY_THRESHOLD && (!best || adjusted > best.score)) {
      best = { paragraph: p, score: adjusted };
    }
  }

  return best;
}

export function reconcileAnchors(
  _oldContent: string,
  newContent: string,
  sidecar: AnchorSidecar,
): ReconciledSidecar {
  const paragraphs = parseParagraphs(newContent);
  const used = new Set<number>();

  const anchors: ReconciledAnchor[] = sidecar.anchors.map((anchor) => {
    const hintIndex = anchor.paragraphIndex;

    const exact = findExactMatch(anchor.fingerprint, paragraphs, used);
    if (exact) {
      used.add(exact.index);
      return {
        ...anchor,
        fingerprint: exact.fingerprint,
        preview: previewText(exact.text),
        paragraphIndex: exact.index,
        status: "attached",
        matchKind: "exact",
      };
    }

    const fuzzy = findFuzzyMatch(
      anchor.preview,
      paragraphs,
      used,
      hintIndex,
    );
    if (fuzzy) {
      used.add(fuzzy.paragraph.index);
      return {
        ...anchor,
        fingerprint: fuzzy.paragraph.fingerprint,
        preview: previewText(fuzzy.paragraph.text),
        paragraphIndex: fuzzy.paragraph.index,
        status: "attached",
        matchKind: "fuzzy",
      };
    }

    if (
      hintIndex !== undefined &&
      hintIndex < paragraphs.length &&
      !used.has(hintIndex)
    ) {
      const atHint = paragraphs[hintIndex]!;
      const score = similarity(anchor.preview, atHint.text);
      if (score >= FUZZY_THRESHOLD * 0.9) {
        used.add(hintIndex);
        return {
          ...anchor,
          fingerprint: atHint.fingerprint,
          preview: previewText(atHint.text),
          paragraphIndex: hintIndex,
          status: "attached",
          matchKind: "position",
        };
      }
    }

    return {
      ...anchor,
      paragraphIndex: undefined,
      status: "orphan",
    };
  });

  return {
    ...sidecar,
    version: sidecar.version + 1,
    anchors,
  };
}
