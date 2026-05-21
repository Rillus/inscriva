import type { AssembledContext } from "./types.js";

export interface SessionPackMeta {
  taskId: string;
  bookTitle?: string;
  chapterKey?: string;
}

function formatSectionRow(section: AssembledContext["sections"][number]): string {
  const status = section.included ? "Included" : "Excluded";
  const path = section.path ? ` (\`${section.path}\`)` : "";
  return `| ${section.label}${path} | ${status} | ${section.chars.toLocaleString()} |`;
}

export function formatSessionPack(
  context: AssembledContext,
  meta: SessionPackMeta,
): string {
  const lines: string[] = [
    "# Inscriva Session Pack",
    "",
    "Copy this document into an external chat tool (ChatGPT, Claude, etc.).",
    "",
    "## Metadata",
    "",
    `- **Task:** ${meta.taskId}`,
  ];

  if (meta.bookTitle) {
    lines.push(`- **Book:** ${meta.bookTitle}`);
  }
  if (meta.chapterKey) {
    lines.push(`- **Chapter:** ${meta.chapterKey}`);
  }
  lines.push(`- **Estimated tokens:** ~${context.estimatedTokens.toLocaleString()}`);
  lines.push(
    "",
    "## Context sections",
    "",
    "| Section | Status | Characters |",
    "| --- | --- | ---: |",
    ...context.sections.map(formatSectionRow),
    "",
    "## System instructions",
    "",
    context.system,
    "",
    "## Assembled context",
    "",
    context.user,
    "",
  );

  return lines.join("\n");
}
