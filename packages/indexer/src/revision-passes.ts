/** LLM task ids used by revision passes (subset of bridge `LlmTaskId`). */
export type RevisionAssistTaskId =
  | "review-structure"
  | "review-voice"
  | "explain-canon"
  | "review-continuity"
  | "fix-paragraph";

export type RevisionPassId =
  | "structure"
  | "character"
  | "tone"
  | "continuity"
  | "line"
  | "read-aloud";

export interface RevisionPass {
  id: RevisionPassId;
  label: string;
  description: string;
  suggestedTaskId?: RevisionAssistTaskId;
}

export const REVISION_PASSES: RevisionPass[] = [
  {
    id: "structure",
    label: "Structure",
    description: "Compare outline beats to draft structure.",
    suggestedTaskId: "review-structure",
  },
  {
    id: "character",
    label: "Character",
    description: "Check character beats against the bible.",
    suggestedTaskId: "explain-canon",
  },
  {
    id: "tone",
    label: "Tone",
    description: "Review voice against the Style Guide.",
    suggestedTaskId: "review-voice",
  },
  {
    id: "continuity",
    label: "Continuity",
    description: "Facts, plants, and timeline hooks.",
    suggestedTaskId: "review-continuity",
  },
  {
    id: "line",
    label: "Line",
    description: "Paragraph-level clarity and flow.",
    suggestedTaskId: "fix-paragraph",
  },
  {
    id: "read-aloud",
    label: "Read aloud",
    description: "Rhythm and mouth-feel — read yourself; no auto-rewrite.",
  },
];

const PLANT_RE =
  /\b(P\d{2,})\b(?:\s+(planted(?:\s*\([^)]*\))?|foreshadow[^\n]*))?/gi;

export function parsePlants(text: string): { id: string; label: string }[] {
  const seen = new Set<string>();
  const plants: { id: string; label: string }[] = [];

  for (const match of text.matchAll(PLANT_RE)) {
    const id = match[1]!.toUpperCase();
    if (seen.has(id)) continue;
    seen.add(id);
    const tail = match[2]?.trim();
    plants.push({ id, label: tail ? `${id} ${tail}` : id });
  }

  return plants;
}

function continuitySectionText(outlineText: string): string {
  const lines = outlineText.split("\n");
  let inContinuity = false;
  const collected: string[] = [];

  for (const line of lines) {
    if (/^##\s+continuity\b/i.test(line)) {
      inContinuity = true;
      continue;
    }
    if (inContinuity && /^##\s+/.test(line)) break;
    if (inContinuity) collected.push(line);
  }

  return collected.join("\n");
}

export function findUnlinkedPlants(
  draftText: string,
  outlineText: string,
): string[] {
  const hooks = continuitySectionText(outlineText);
  const draftUpper = draftText.toUpperCase();

  return parsePlants(hooks)
    .filter((plant) => !draftUpper.includes(plant.id))
    .map((plant) => plant.id);
}
