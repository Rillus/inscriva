import type { CanonEntry, CanonIndex } from "@inscriva/indexer";
import {
  draftExcerptAtOffset,
  sceneHeadingBeforeOffset,
} from "./editor-selection.js";
import {
  parseChapterFocus,
  type ChapterFocus,
} from "./outline-parser.js";

export function resolveCurrentScene(
  heading: string | undefined,
  scenes: string[],
): string | undefined {
  if (!heading) return undefined;
  const h = heading.toLowerCase();
  const exact = scenes.find((s) => s.toLowerCase() === h);
  if (exact) return exact;
  const partial = scenes.find(
    (s) => h.includes(s.toLowerCase()) || s.toLowerCase().includes(h),
  );
  return partial ?? heading;
}

export function formatChapterFocusForContext(
  focus: ChapterFocus,
  currentScene?: string,
): string {
  const lines: string[] = [];

  if (currentScene) lines.push(`**Current scene:** ${currentScene}`);
  if (focus.storyQuestion) {
    lines.push(`**Story question:** ${focus.storyQuestion}`);
  }
  if (focus.turn) lines.push(`**Chapter turn:** ${focus.turn}`);
  if (focus.scenes.length) {
    lines.push("**Scenes in this chapter:**");
    for (const scene of focus.scenes) {
      const marker = scene === currentScene ? " ← current" : "";
      lines.push(`- ${scene}${marker}`);
    }
  }
  if (focus.mustInclude.length) {
    lines.push("**Must include:**");
    for (const item of focus.mustInclude) lines.push(`- ${item}`);
  }
  if (focus.notList.length) {
    lines.push("**Do not include:**");
    for (const item of focus.notList) lines.push(`- ${item}`);
  }
  if (focus.wordTarget) lines.push(`**Word target:** ${focus.wordTarget}`);
  if (focus.continuity.length) {
    lines.push("**Continuity notes:**");
    for (const note of focus.continuity) lines.push(`- ${note}`);
  }

  return lines.join("\n");
}

export function formatRelevantCanon(entries: CanonEntry[]): string | undefined {
  if (entries.length === 0) return undefined;
  const unique = [...new Map(entries.map((e) => [e.path, e])).values()];
  return unique
    .map((e) => `**${e.title}** (${e.path})\n${e.excerpt}`)
    .join("\n\n");
}

export interface WritingContextInput {
  editorContent: string;
  outlineContent: string;
  canonIndex?: CanonIndex | null;
  /** Caret or selection end — used to locate scene and paragraph. */
  offset: number;
  /** Text being edited (selection or sentence). */
  workingText?: string;
}

export interface WritingContext {
  draftExcerpt?: string;
  chapterFocus?: string;
  relevantCanon?: string;
}

export function assembleWritingContext(
  input: WritingContextInput,
): WritingContext {
  const { editorContent, outlineContent, canonIndex, offset, workingText } =
    input;

  const draftExcerpt = draftExcerptAtOffset(editorContent, offset);
  const focus = parseChapterFocus(outlineContent);
  const heading = sceneHeadingBeforeOffset(editorContent, offset);
  const currentScene = resolveCurrentScene(heading, focus.scenes);
  const chapterFocus = formatChapterFocusForContext(focus, currentScene);

  const canonHaystack = [draftExcerpt, workingText].filter(Boolean).join("\n\n");
  const relevantCanon =
    canonIndex && canonHaystack.trim()
      ? formatRelevantCanon(canonIndex.termsInText(canonHaystack))
      : undefined;

  return {
    draftExcerpt: draftExcerpt?.trim() || undefined,
    chapterFocus: chapterFocus.trim() || undefined,
    relevantCanon,
  };
}
