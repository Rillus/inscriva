import { findUnlinkedPlants } from "./revision-passes.js";
import { parseChapterFocus } from "./outline-parse.js";
import {
  countWords,
  draftWordTargetStatus,
  parseWordTarget,
  type DraftWordTargetStatus,
} from "./word-target.js";

export interface SceneHeadingMatch {
  label: string;
  matched: boolean;
}

export interface MustIncludeCheck {
  item: string;
  status: "hit" | "miss" | "uncertain";
}

export interface MustNotCheck {
  term: string;
  violated: boolean;
}

export interface AlignmentReport {
  chapterKey: string;
  generatedAt: string;
  wordCount: {
    draftWords: number;
    target: ReturnType<typeof parseWordTarget>;
    status: DraftWordTargetStatus;
  };
  plants: { unlinked: string[] };
  scenes: {
    matched: string[];
    missing: string[];
    extra: string[];
  };
  mustInclude: MustIncludeCheck[];
  mustNot: MustNotCheck[];
}

const SCENE_IN_OUTLINE_RE = /##\s+Scene\s+(\d+)\s*[—–-]\s*(.+)/gi;

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function expectedSceneLabels(outlineMarkdown: string): string[] {
  const fromHeadings: string[] = [];
  for (const m of outlineMarkdown.matchAll(SCENE_IN_OUTLINE_RE)) {
    fromHeadings.push(`Scene ${m[1]} — ${m[2]!.trim()}`);
  }
  if (fromHeadings.length) return fromHeadings;

  const focus = parseChapterFocus(outlineMarkdown);
  return focus.scenes.map((s) => s.label);
}

export function draftHasSceneHeading(label: string, draftMarkdown: string): boolean {
  const sceneForm = label.match(/^Scene\s+(\d+)\s*[—–-]\s*(.+)$/i);
  for (const line of draftMarkdown.split("\n")) {
    const h = line.match(/^##\s+(.+)$/);
    if (!h) continue;
    const heading = h[1]!.trim();
    if (heading === label) return true;

    if (sceneForm) {
      const n = sceneForm[1]!;
      const title = sceneForm[2]!.trim();
      const numbered = new RegExp(
        `^Scene\\s+${n}\\s*[—–-]\\s*${escapeRegex(title)}`,
        "i",
      );
      if (numbered.test(heading)) return true;
      if (heading.toLowerCase() === title.toLowerCase()) return true;
    } else if (heading.toLowerCase() === label.toLowerCase()) {
      return true;
    }
  }
  return false;
}

export function draftSceneHeadingLabels(draftMarkdown: string): string[] {
  const labels: string[] = [];
  for (const line of draftMarkdown.split("\n")) {
    const h = line.match(/^##\s+(.+)$/);
    if (h) labels.push(h[1]!.trim());
  }
  return labels;
}

export function matchSceneHeadings(
  outlineMarkdown: string,
  draftMarkdown: string,
): { matched: string[]; missing: string[]; extra: string[] } {
  const expected = expectedSceneLabels(outlineMarkdown);
  const foundHeadings = draftSceneHeadingLabels(draftMarkdown);

  const matched = expected.filter((l) => draftHasSceneHeading(l, draftMarkdown));
  const missing = expected.filter((l) => !draftHasSceneHeading(l, draftMarkdown));

  const expectedLower = new Set(
    expected.map((l) => {
      const m = l.match(/^Scene\s+\d+\s*[—–-]\s*(.+)$/i);
      return (m ? m[1]! : l).toLowerCase();
    }),
  );
  const extra = foundHeadings.filter((h) => {
    if (expected.includes(h)) return false;
    const fromScene = h.match(/^Scene\s+\d+\s*[—–-]\s*(.+)$/i);
    const key = (fromScene ? fromScene[1]! : h).toLowerCase();
    return !expectedLower.has(key);
  });

  return { matched, missing, extra };
}

function checkMustInclude(item: string, draft: string): MustIncludeCheck["status"] {
  const tokens = item
    .toLowerCase()
    .replace(/\[\[.*?\]\]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 3);
  if (tokens.length === 0) return "uncertain";
  const hits = tokens.filter((t) => draft.toLowerCase().includes(t));
  if (hits.length === tokens.length) return "hit";
  if (hits.length === 0) return "miss";
  return "uncertain";
}

export function buildAlignmentReport(input: {
  chapterKey: string;
  outlineMarkdown: string;
  draftMarkdown: string;
  generatedAt?: string;
}): AlignmentReport {
  const focus = parseChapterFocus(input.outlineMarkdown);
  const draftWords = countWords(input.draftMarkdown);
  const target = parseWordTarget(focus.wordTarget);
  const scenes = matchSceneHeadings(input.outlineMarkdown, input.draftMarkdown);
  const unlinked = findUnlinkedPlants(input.draftMarkdown, input.outlineMarkdown);

  return {
    chapterKey: input.chapterKey,
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    wordCount: {
      draftWords,
      target,
      status: draftWordTargetStatus(draftWords, target),
    },
    plants: { unlinked },
    scenes,
    mustInclude: focus.mustInclude.map((item) => ({
      item,
      status: checkMustInclude(item, input.draftMarkdown),
    })),
    mustNot: focus.notList.map((term) => ({
      term,
      violated: input.draftMarkdown.toLowerCase().includes(term.toLowerCase()),
    })),
  };
}

export function formatAlignmentMarkdown(report: AlignmentReport): string {
  const lines: string[] = [
    `# Alignment — ${report.chapterKey}`,
    "",
    `_Generated ${report.generatedAt}_`,
    "",
    "## Word count",
    "",
    `- **Draft words:** ${report.wordCount.draftWords}`,
    `- **Target:** ${report.wordCount.target ? `${report.wordCount.target.min}${report.wordCount.target.max !== report.wordCount.target.min ? `–${report.wordCount.target.max}` : ""}` : "—"}`,
    `- **Status:** ${report.wordCount.status} (band 90–110%)`,
    "",
    "## Plants",
    "",
  ];

  if (report.plants.unlinked.length) {
    lines.push(`Unlinked: ${report.plants.unlinked.map((p) => `\`${p}\``).join(", ")}`);
  } else {
    lines.push("All continuity plants referenced in draft.");
  }

  lines.push("", "## Scenes", "");
  if (report.scenes.matched.length) {
    lines.push("**Matched:**", ...report.scenes.matched.map((s) => `- ${s}`), "");
  }
  if (report.scenes.missing.length) {
    lines.push("**Missing in draft:**", ...report.scenes.missing.map((s) => `- ${s}`), "");
  }
  if (report.scenes.extra.length) {
    lines.push("**Extra in draft:**", ...report.scenes.extra.map((s) => `- ${s}`), "");
  }

  lines.push("## Must include", "");
  for (const m of report.mustInclude) {
    const icon = m.status === "hit" ? "✓" : m.status === "miss" ? "✗" : "?";
    lines.push(`- ${icon} ${m.item} (${m.status})`);
  }

  lines.push("", "## Must NOT", "");
  for (const m of report.mustNot) {
    lines.push(`- ${m.violated ? "✗ VIOLATION" : "✓ clear"}: ${m.term}`);
  }

  return `${lines.join("\n")}\n`;
}
