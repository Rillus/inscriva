export const SCENE_LEDGER_PATH = "03 Revision/Scene Ledger.md";

const SCENE_LEDGER_HEADER = `# Scene Ledger

Auto-suggested from draft scene headings. Edit freely — Inscriva will not overwrite existing lines.

`;

const DRAFT_SCENE_HEADING_RE = /^##\s+(Scene\s+\d+\s*[—–-]\s*.+)$/i;

export function extractDraftSceneHeadings(draftMarkdown: string): string[] {
  const scenes: string[] = [];
  for (const line of draftMarkdown.split("\n")) {
    const match = line.match(DRAFT_SCENE_HEADING_RE);
    if (match) scenes.push(match[1]!.trim());
  }
  return scenes;
}

export function formatSceneLedgerEntry(input: {
  chapterKey: string;
  sceneLabel: string;
}): string {
  return `- ${input.chapterKey} · ${input.sceneLabel}`;
}

export function appendSceneLedgerEntries(
  existingMarkdown: string,
  chapterKey: string,
  sceneLabels: string[],
): string {
  let md = existingMarkdown.trim();
  if (!md) md = SCENE_LEDGER_HEADER.trimEnd();

  const existingLines = new Set(
    md.split("\n").map((l) => l.trim()).filter(Boolean),
  );

  const additions = sceneLabels
    .map((sceneLabel) => formatSceneLedgerEntry({ chapterKey, sceneLabel }))
    .filter((line) => !existingLines.has(line));

  if (!additions.length) return `${md}\n`;

  return `${md.trimEnd()}\n${additions.join("\n")}\n`;
}
