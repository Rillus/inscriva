import type { CastCharacter } from "./cast-index.js";

export const GENERATED_APPEARANCES_DIR = "00 Canon/Character Bible/_generated/";

export function characterAppearancesPath(characterName: string): string {
  const safe = characterName.replace(/[/\\]+/g, "-").trim() || "Character";
  return `${GENERATED_APPEARANCES_DIR}${safe} - appearances.md`;
}

export function formatCharacterAppearancesMarkdown(
  character: CastCharacter,
  generatedAt: string,
): string {
  const lines: string[] = [
    `# ${character.name} — appearances`,
    "",
    `_Generated ${generatedAt} by Inscriva from draft scans. Edit the Character Bible for canon; this file is derived._`,
    "",
    "## Appearances",
    "",
    "| Chapter | Mentions | Words in chapter |",
    "|---------|----------|------------------|",
  ];

  for (const row of character.appearances) {
    lines.push(
      `| ${row.chapterKey} | ${row.mentionCount} | ${row.draftWordCount} |`,
    );
  }

  if (character.mentions.length) {
    lines.push("", "## Mention snippets", "");
    for (const mention of character.mentions.slice(0, 24)) {
      lines.push(`- **${mention.chapterKey}:** …${mention.snippet}…`);
    }
  }

  if (character.dialogue.length) {
    lines.push("", "## Dialogue", "");
    for (const line of character.dialogue.slice(0, 24)) {
      lines.push(`- **${line.chapterKey}:** "${line.quote}"`);
    }
  }

  lines.push("");
  return lines.join("\n");
}
