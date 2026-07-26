/** True when an H1 or extracted segment is still a new-book template placeholder. */
export function isPlaceholderChapterTitle(title: string): boolean {
  const t = title.trim();
  if (!t) return true;
  if (/^ChNN\b/i.test(t)) return true;
  if (/\[Working title\]/i.test(t)) return true;
  if (/^\[.+\]$/i.test(t)) return true;
  return false;
}

/** Strip `# Ch01 —` / `# Ch01:` style prefixes from an H1 line body. */
export function stripChapterPrefixFromH1(h1Body: string): string {
  return h1Body
    .trim()
    .replace(/^Ch\d+\s*[—:–\-]\s*/i, "")
    .replace(/^Ch\d+\s*:\s*/i, "")
    .trim();
}

export function extractTitleFromOutline(markdown: string | undefined): string | null {
  if (!markdown?.trim()) return null;
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (!h1) return null;

  const raw = h1[1]!.trim();
  if (isPlaceholderChapterTitle(raw)) return null;

  const stripped = stripChapterPrefixFromH1(raw);
  if (!stripped || isPlaceholderChapterTitle(stripped)) return null;

  return stripped;
}

export function extractTitleFromFilename(path: string): string | null {
  const base = (path.split("/").pop() ?? path).replace(/\.md$/i, "").trim();
  if (!base) return null;

  let title = base.replace(/^Ch\d+\s*[-–—]\s*/i, "").trim();
  if (title === base) {
    title = base.replace(/^\d{1,3}\s*[-–—]\s*/, "").trim();
  }

  if (!title || title === base || isPlaceholderChapterTitle(title)) return null;
  return title;
}

export function resolveChapterTitle(input: {
  outlineMarkdown?: string;
  draftMarkdown?: string;
  draftPath?: string;
  outlinePath?: string;
}): string | undefined {
  const fromOutline = extractTitleFromOutline(input.outlineMarkdown);
  if (fromOutline) return fromOutline;

  const fromDraftH1 = extractTitleFromOutline(input.draftMarkdown);
  if (fromDraftH1) return fromDraftH1;

  if (input.draftPath) {
    const fromDraftFile = extractTitleFromFilename(input.draftPath);
    if (fromDraftFile) return fromDraftFile;
  }

  if (input.outlinePath) {
    const fromOutlineFile = extractTitleFromFilename(input.outlinePath);
    if (fromOutlineFile) return fromOutlineFile;
  }

  return undefined;
}
