import {
  autocompletion,
  type Completion,
  type CompletionContext,
} from "@codemirror/autocomplete";
import { hoverTooltip, type Tooltip } from "@codemirror/view";
import type { CanonIndex } from "@inscriva/indexer";

export function canonHoverExtension(index: CanonIndex | null) {
  return hoverTooltip((view, pos) => {
    if (!index) return null;

    const line = view.state.doc.lineAt(pos);
    const lineText = line.text;
    const offset = pos - line.from;

    const wordMatch = findWordAt(lineText, offset);
    if (!wordMatch) return null;

    const entry = index.lookup(wordMatch.word);
    if (!entry) return null;

    return {
      pos: line.from + wordMatch.start,
      end: line.from + wordMatch.end,
      create() {
        const dom = document.createElement('div');
        dom.className = "canon-tooltip";
        dom.innerHTML = `<strong>${escapeHtml(entry.title)}</strong><p>${escapeHtml(entry.excerpt)}</p><span class="path">${escapeHtml(entry.path)}</span>`;
        return { dom };
      },
    } satisfies Tooltip;
  });
}

function wikilinkCompletionSource(index: CanonIndex | null) {
  return (context: CompletionContext) => {
    const before = context.matchBefore(/\[\[[^\]]*$/);
    if (!before) return null;

    const query = before.text.slice(2);
    const options: Completion[] = (index?.autocomplete(query) ?? []).map(
      (entry) => ({
        label: entry.title,
        type: "text",
        apply: `${entry.title}]]`,
      }),
    );

    return {
      from: before.from + 2,
      options,
      validFor: /^\[\[[^\]]*$/,
    };
  };
}

export function wikilinkAutocomplete(index: CanonIndex | null) {
  return autocompletion({
    override: [wikilinkCompletionSource(index)],
  });
}

function findWordAt(
  text: string,
  offset: number,
): { word: string; start: number; end: number } | null {
  const re = /[A-Za-z][A-Za-z'-]*/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    const start = match.index;
    const end = start + match[0].length;
    if (offset >= start && offset <= end) {
      return { word: match[0], start, end };
    }
  }
  return null;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
