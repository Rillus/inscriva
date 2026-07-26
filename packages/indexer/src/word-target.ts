/** Recommendation and alignment band for draft vs outline word target (locked: 90–110%). */
export const DEFAULT_WORD_TARGET_BAND = { minRatio: 0.9, maxRatio: 1.1 } as const;

export interface WordTargetBand {
  minRatio: number;
  maxRatio: number;
}

export interface WordTarget {
  min: number;
  max: number;
}

export type DraftWordTargetStatus = "under" | "within" | "over" | "unknown";

const WORD_TARGET_RE =
  /(\d[\d,]*)\s*(?:[-–—]\s*(\d[\d,]*)|(?:\s*(?:to|-|–)\s*(\d[\d,]*)))?/;

function parseDigits(raw: string): number {
  return Number(raw.replace(/,/g, ""));
}

/** Count words in prose (whitespace-separated tokens). */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

/** Parse outline `## Word target` (single number or range). */
export function parseWordTarget(raw: string | undefined): WordTarget | null {
  if (!raw?.trim()) return null;
  const match = raw.match(WORD_TARGET_RE);
  if (!match) return null;

  const min = parseDigits(match[1]!);
  const maxRaw = match[2] ?? match[3];
  const max = maxRaw ? parseDigits(maxRaw) : min;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return null;

  return { min: Math.min(min, max), max: Math.max(min, max) };
}

function bandBounds(target: WordTarget, band: WordTargetBand): { low: number; high: number } {
  return {
    low: Math.round(target.min * band.minRatio),
    high: Math.round(target.max * band.maxRatio),
  };
}

export function wordsWithinTargetBand(
  draftWords: number,
  target: WordTarget,
  band: WordTargetBand = DEFAULT_WORD_TARGET_BAND,
): boolean {
  const { low, high } = bandBounds(target, band);
  return draftWords >= low && draftWords <= high;
}

export function draftWordTargetStatus(
  draftWords: number,
  target: WordTarget | null,
  band: WordTargetBand = DEFAULT_WORD_TARGET_BAND,
): DraftWordTargetStatus {
  if (!target) return "unknown";
  const { low, high } = bandBounds(target, band);
  if (draftWords < low) return "under";
  if (draftWords > high) return "over";
  return "within";
}
