import { pairChapters } from "@inscriva/indexer";
import { getTaskSystemPrompt } from "./prompts.js";
import type { AssembledContext, ContextInput, ContextSection } from "./types.js";

const DEFAULT_MAX_CHARS = 24_000;

const CANON_SLOTS: { label: string; pattern: RegExp }[] = [
  { label: "Style Guide", pattern: /style\s*guide/i },
  { label: "Character Bible", pattern: /character\s*bible/i },
  { label: "Continuity Log", pattern: /continuity\s*log/i },
];

const PRIORITY: Record<string, number> = {
  "Chapter outline": 0,
  "Chapter focus": 1,
  "Continuity Log": 2,
  "Style Guide": 3,
  Selection: 4,
  "Draft excerpt": 5,
  "Relevant canon": 6,
  "Character Bible": 7,
  "Author note": 8,
};

function estimateTokens(chars: number): number {
  return Math.ceil(chars / 4);
}

function indexCanonPaths(files: Map<string, string>): Map<string, string> {
  const index = new Map<string, string>();
  for (const path of files.keys()) {
    if (!path.startsWith("00 Canon/")) continue;
    const name = path.split("/").pop() ?? path;
    for (const slot of CANON_SLOTS) {
      if (slot.pattern.test(name)) index.set(slot.label, path);
    }
  }
  return index;
}

function trimSections(
  sections: { label: string; path?: string; body: string }[],
  maxChars: number,
): ContextSection[] {
  const sorted = [...sections].sort(
    (a, b) => (PRIORITY[a.label] ?? 99) - (PRIORITY[b.label] ?? 99),
  );

  const result: ContextSection[] = [];
  let used = 0;

  for (const section of sorted) {
    const remaining = maxChars - used;
    if (remaining <= 0) {
      result.push({ label: section.label, path: section.path, chars: section.body.length, included: false });
      continue;
    }

    let body = section.body;
    if (body.length > remaining) {
      body = body.slice(0, remaining) + "\n…[trimmed]";
    }

    result.push({
      label: section.label,
      path: section.path,
      chars: body.length,
      included: true,
    });
    used += body.length;
    section.body = body;
  }

  return result;
}

export function buildContext(input: ContextInput): AssembledContext {
  const maxChars = input.maxChars ?? DEFAULT_MAX_CHARS;
  const blocks: { label: string; path?: string; body: string }[] = [];
  const canonPaths = indexCanonPaths(input.bookFiles);
  const chapterPairs = input.chapterKey
    ? pairChapters([...input.bookFiles.keys()])
    : null;

  for (const slot of CANON_SLOTS) {
    const path = canonPaths.get(slot.label);
    if (!path) continue;
    const content = input.bookFiles.get(path);
    if (!content?.trim()) continue;
    blocks.push({ label: slot.label, path, body: content.trim() });
  }

  if (input.chapterKey && chapterPairs) {
    const outlinePath = chapterPairs.find((p) => p.key === input.chapterKey)
      ?.outline;
    if (outlinePath) {
      const content = input.bookFiles.get(outlinePath);
      if (content?.trim()) {
        blocks.push({
          label: "Chapter outline",
          path: outlinePath,
          body: content.trim(),
        });
      }
    }
  }

  if (input.chapterFocus?.trim()) {
    blocks.push({
      label: "Chapter focus",
      body: input.chapterFocus.trim(),
    });
  }

  if (input.selectionText?.trim()) {
    blocks.push({ label: "Selection", body: input.selectionText.trim() });
  }

  if (input.draftExcerpt?.trim()) {
    blocks.push({ label: "Draft excerpt", body: input.draftExcerpt.trim() });
  }

  if (input.relevantCanon?.trim()) {
    blocks.push({ label: "Relevant canon", body: input.relevantCanon.trim() });
  }

  if (input.userMessage?.trim()) {
    blocks.push({ label: "Author note", body: input.userMessage.trim() });
  }

  const sectionMeta = trimSections(blocks, maxChars);
  const includedBodies = blocks
    .filter((b) => sectionMeta.find((s) => s.label === b.label)?.included)
    .map((b) => `## ${b.label}${b.path ? ` (${b.path})` : ""}\n\n${b.body}`);

  const userParts = [
    `Task: ${input.taskId}`,
    input.chapterKey ? `Chapter: ${input.chapterKey}` : null,
    "",
    ...includedBodies,
  ].filter((p) => p !== null) as string[];

  const user = userParts.join("\n");
  const system = getTaskSystemPrompt(input.taskId);
  const chars = system.length + user.length;

  return {
    system,
    user,
    sections: sectionMeta,
    estimatedTokens: estimateTokens(chars),
  };
}
