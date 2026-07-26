import {
  CHAPTER_OUTLINE_FORMAT_GUIDE,
  formatMasterChapterForContext,
  type MasterChapterEntry,
} from "@inscriva/indexer";

export function formatExpandOutlineContext(input: {
  entry: MasterChapterEntry;
  existingChapterOutline?: string;
}): string {
  const lines: string[] = [
    "Expand the book-outline beat below into a chapter outline.",
    "",
    CHAPTER_OUTLINE_FORMAT_GUIDE,
    "",
    formatMasterChapterForContext(input.entry),
  ];

  if (input.existingChapterOutline?.trim()) {
    lines.push(
      "",
      "**Existing chapter outline (improve or replace scenes; keep Status if set):**",
      input.existingChapterOutline.trim(),
    );
  }

  return lines.join("\n");
}
