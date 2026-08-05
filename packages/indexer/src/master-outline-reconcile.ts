import { normaliseChapterKey } from "./outline-parse.js";

function setStatusInBlock(block: string, status: string): string {
  const trimmed = status.trim();
  if (/^\*\*Status:\*\*/im.test(block)) {
    return block.replace(/^\*\*Status:\*\*\s*.+$/im, `**Status:** ${trimmed}`);
  }
  const lines = block.split("\n");
  const heading = lines[0] ?? "";
  const rest = lines.slice(1).join("\n");
  if (!rest.trim()) {
    return `${heading}\n**Status:** ${trimmed}\n`;
  }
  return `${heading}\n**Status:** ${trimmed}\n${rest}`;
}

export function reconcileMasterOutlineStatuses(
  masterMarkdown: string,
  statusesByKey: Record<string, string | undefined>,
): string {
  const parts = masterMarkdown.split(/(?=^##\s+Ch\d+)/im);
  return parts
    .map((part) => {
      const headingMatch = part.match(/^##\s+(Ch\d+)/i);
      if (!headingMatch) return part;
      const key = normaliseChapterKey(headingMatch[1]!);
      const status = statusesByKey[key];
      if (!status?.trim()) return part;
      return setStatusInBlock(part, status);
    })
    .join("");
}
