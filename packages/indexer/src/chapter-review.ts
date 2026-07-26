import { ALIGNMENT_EXPORT_DIR } from "./sidecar-path.js";

export function aiReviewExportPath(chapterKey: string): string {
  return `${ALIGNMENT_EXPORT_DIR}/${chapterKey} - AI review.md`;
}

/** Extract author-facing status from an AI review (e.g. Approved, Needs revision). */
export function parseAiReviewStatus(markdown: string): string | null {
  const bold = markdown.match(/\*\*Status:\*\*\s*\*?\*?\s*([^*\n.]+)/i);
  if (bold) return bold[1]!.trim();

  const plain = markdown.match(/^status:\s*(.+)$/im);
  if (plain) return plain[1]!.trim().replace(/\.$/, "");

  return null;
}

export function formatAiReviewMarkdown(
  chapterKey: string,
  body: string,
  generatedAt: string,
): string {
  const trimmed = body.trim();
  return `# AI chapter review — ${chapterKey}

_Generated ${generatedAt} by Inscriva (review-chapter-goals). Not applied to your outline automatically._

---

${trimmed}
${trimmed.endsWith("\n") ? "" : "\n"}`;
}

export function setOutlineStatus(outlineMarkdown: string, status: string): string {
  const trimmed = status.trim();
  let md = outlineMarkdown;

  if (/^status:\s*.+$/m.test(md)) {
    md = md.replace(/^status:\s*.+$/m, `status: ${trimmed}`);
  } else if (/^---\n[\s\S]*?---\n/.test(md)) {
    md = md.replace(/^(---\n)/, `$1status: ${trimmed}\n`);
  }

  if (/^##\s+Status\s*$/im.test(md)) {
    return md.replace(
      /^##\s+Status\s*\n[\s\S]*?(?=\n##\s|$)/im,
      `## Status\n${trimmed}\n\n`,
    );
  }

  const h1 = md.match(/^#\s+.+\n/);
  if (h1) {
    const insertAt = h1[0]!.length;
    return (
      md.slice(0, insertAt) +
      `\n## Status\n${trimmed}\n\n` +
      md.slice(insertAt)
    );
  }

  return `## Status\n${trimmed}\n\n${md}`;
}
