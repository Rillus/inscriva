import { forceParsing, syntaxTree } from "@codemirror/language";
import { StateEffect, type EditorState } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { MarkdownDecorationQueue } from "./markdown-decoration-queue.js";
import {
  delimitedMarkRanges,
  headingLevel,
  headingTitleStart,
  isInCodeContext,
  syntaxNodeAtSpan,
} from "./markdown-syntax.js";
import { tableVisualModeFacet } from "./markdown-table-visual.js";

export function rangeOverlaps(
  aFrom: number,
  aTo: number,
  bFrom: number,
  bTo: number,
): boolean {
  return aFrom < bTo && bFrom < aTo;
}

export function cursorTouchesRange(
  ranges: readonly { from: number; to: number }[],
  span: { from: number; to: number },
): boolean {
  for (const range of ranges) {
    if (rangeOverlaps(range.from, range.to, span.from, span.to)) return true;
  }
  return false;
}

const delimitedInline = [
  { name: "Emphasis", mark: "EmphasisMark", style: "cm-md-emphasis" },
  { name: "StrongEmphasis", mark: "EmphasisMark", style: "cm-md-strong" },
  { name: "Strikethrough", mark: "StrikethroughMark", style: "cm-md-strikethrough" },
  { name: "Superscript", mark: "SuperscriptMark", style: "cm-md-sup" },
  { name: "Subscript", mark: "SubscriptMark", style: "cm-md-sub" },
] as const;

function addDelimitedInline(
  queue: MarkdownDecorationQueue,
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
  markName: string,
  styleClass: string,
) {
  if (isInCodeContext(state, node.from)) return;

  const syn = syntaxNodeAtSpan(state, node.from, node.to, node.name);
  if (!syn) return;

  const marks = delimitedMarkRanges(syn, markName);
  if (!marks) return;

  const active = cursorTouchesRange(ranges, node);
  if (!active) {
    queue.hide(marks.openFrom, marks.openTo);
  }
  queue.mark(marks.contentFrom, marks.contentTo, styleClass);
  if (!active) {
    queue.hide(marks.closeFrom, marks.closeTo);
  }
}

function addHeading(
  queue: MarkdownDecorationQueue,
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
) {
  const level = headingLevel(node.name);
  if (level === null) return;

  const syn = syntaxNodeAtSpan(state, node.from, node.to, node.name);
  if (!syn) return;

  const active = cursorTouchesRange(ranges, node);
  const headerMarks = syn.getChildren("HeaderMark");

  if (node.name.startsWith("Setext")) {
    if (!active) {
      for (const mark of headerMarks) queue.hide(mark.from, mark.to);
    }
    const contentTo = headerMarks[0]?.from ?? node.to;
    queue.mark(node.from, contentTo, `cm-md-h${level}`);
    return;
  }

  const mark = headerMarks[0];
  const titleFrom = mark
    ? headingTitleStart(state.doc, mark.to, node.to)
    : node.from;

  if (!active && mark) {
    queue.hide(mark.from, mark.to);
    queue.hide(mark.to, titleFrom);
  }
  queue.mark(titleFrom, node.to, `cm-md-h${level}`);
}

function addLinkOrImage(
  queue: MarkdownDecorationQueue,
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
) {
  if (isInCodeContext(state, node.from)) return;

  const syn = syntaxNodeAtSpan(state, node.from, node.to, node.name);
  if (!syn) return;

  const active = cursorTouchesRange(ranges, node);
  const linkMarks = syn.getChildren("LinkMark");
  const url = syn.getChild("URL");

  const labelFrom = linkMarks[0]?.to ?? node.from;
  const labelTo = linkMarks[1]?.from ?? node.to;
  if (labelFrom < labelTo) {
    const style =
      node.name === "Image" ? "cm-md-image-alt" : "cm-md-link";
    queue.mark(labelFrom, labelTo, style);
  }

  if (!active) {
    for (const mark of linkMarks) queue.hide(mark.from, mark.to);
    if (url) queue.hide(url.from, url.to);
  }
}

function addInlineCode(
  queue: MarkdownDecorationQueue,
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
) {
  const syn = syntaxNodeAtSpan(state, node.from, node.to, node.name);
  if (!syn) return;

  const marks = delimitedMarkRanges(syn, "CodeMark");
  if (!marks) return;

  const active = cursorTouchesRange(ranges, node);
  queue.mark(marks.contentFrom, marks.contentTo, "cm-md-inline-code");
  if (!active) {
    queue.hide(marks.openFrom, marks.openTo);
    queue.hide(marks.closeFrom, marks.closeTo);
  }
}

function addFencedCode(
  queue: MarkdownDecorationQueue,
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
) {
  const syn = syntaxNodeAtSpan(state, node.from, node.to, node.name);
  if (!syn) return;

  const active = cursorTouchesRange(ranges, node);
  const codeMarks = syn.getChildren("CodeMark");
  const codeInfo = syn.getChild("CodeInfo");

  const contentFrom = codeMarks[0]?.to ?? node.from;
  const contentTo = codeMarks[codeMarks.length - 1]?.from ?? node.to;
  if (contentFrom < contentTo) {
    queue.mark(contentFrom, contentTo, "cm-md-fenced-code");
  }

  if (!active) {
    for (const mark of codeMarks) queue.hide(mark.from, mark.to);
    if (codeInfo) queue.hide(codeInfo.from, codeInfo.to);
  }
}

function addBlockquote(
  queue: MarkdownDecorationQueue,
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
) {
  const syn = syntaxNodeAtSpan(state, node.from, node.to, node.name);
  if (!syn) return;

  const active = cursorTouchesRange(ranges, node);
  if (!active) {
    for (const mark of syn.getChildren("QuoteMark")) {
      queue.hide(mark.from, mark.to);
    }
  }
  queue.mark(node.from, node.to, "cm-md-blockquote");
}

function addListItem(
  queue: MarkdownDecorationQueue,
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
) {
  const syn = syntaxNodeAtSpan(state, node.from, node.to, node.name);
  if (!syn) return;

  const active = cursorTouchesRange(ranges, node);
  if (!active) {
    for (const mark of syn.getChildren("ListMark")) {
      queue.hide(mark.from, mark.to);
    }
  }
}

function addTable(
  queue: MarkdownDecorationQueue,
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
) {
  if (state.facet(tableVisualModeFacet)) return;

  const syn = syntaxNodeAtSpan(state, node.from, node.to, node.name);
  if (!syn) return;

  const active = cursorTouchesRange(ranges, node);
  for (const cell of syn.getChildren("TableCell")) {
    queue.mark(cell.from, cell.to, "cm-md-table-cell");
  }
  for (const header of syn.getChildren("TableHeader")) {
    queue.mark(header.from, header.to, "cm-md-table-header");
  }
  if (!active) {
    for (const delim of syn.getChildren("TableDelimiter")) {
      queue.hide(delim.from, delim.to);
    }
  }
}

function addTask(
  queue: MarkdownDecorationQueue,
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
) {
  const syn = syntaxNodeAtSpan(state, node.from, node.to, node.name);
  if (!syn) return;

  const active = cursorTouchesRange(ranges, node);
  if (!active) {
    for (const mark of syn.getChildren("TaskMarker")) {
      queue.hide(mark.from, mark.to);
    }
  }
}

function addHorizontalRule(
  queue: MarkdownDecorationQueue,
  ranges: readonly { from: number; to: number }[],
  node: { from: number; to: number; name: string },
) {
  const active = cursorTouchesRange(ranges, node);
  if (!active) {
    queue.mark(node.from, node.to, "cm-md-hr");
  }
}

export type MarkdownPreviewParseRequest = {
  fullDocument?: boolean;
};

export const refreshMarkdownPreviewEffect =
  StateEffect.define<MarkdownPreviewParseRequest>();

export function isMarkdownPreviewReady(state: EditorState): boolean {
  if (state.doc.length === 0) return true;
  return syntaxTree(state).length > 0;
}

/** Schedule a safe parse + decoration rebuild (never runs during an in-flight update). */
export function refreshMarkdownPreview(
  view: EditorView,
  options?: MarkdownPreviewParseRequest,
): void {
  queueMicrotask(() => {
    if (view.isDestroyed) return;
    view.requestMeasure();
    view.dispatch({
      effects: refreshMarkdownPreviewEffect.of(options ?? {}),
    });
  });
}

export function buildLivePreviewDecorations(state: EditorState): DecorationSet {
  if (state.doc.length > 0 && syntaxTree(state).length === 0) {
    return Decoration.none;
  }

  const queue = new MarkdownDecorationQueue();
  const ranges = state.selection.ranges;

  syntaxTree(state).iterate({
    enter(node) {
      switch (node.name) {
        case "Emphasis":
        case "StrongEmphasis":
        case "Strikethrough":
        case "Superscript":
        case "Subscript": {
          const spec = delimitedInline.find((d) => d.name === node.name);
          if (spec) {
            addDelimitedInline(
              queue,
              state,
              ranges,
              node,
              spec.mark,
              spec.style,
            );
          }
          break;
        }
        case "ATXHeading1":
        case "ATXHeading2":
        case "ATXHeading3":
        case "ATXHeading4":
        case "ATXHeading5":
        case "ATXHeading6":
        case "SetextHeading1":
        case "SetextHeading2":
          addHeading(queue, state, ranges, node);
          break;
        case "Link":
        case "Image":
          addLinkOrImage(queue, state, ranges, node);
          break;
        case "InlineCode":
          addInlineCode(queue, state, ranges, node);
          break;
        case "FencedCode":
          addFencedCode(queue, state, ranges, node);
          break;
        case "Blockquote":
          addBlockquote(queue, state, ranges, node);
          break;
        case "ListItem":
          addListItem(queue, state, ranges, node);
          break;
        case "Table":
          addTable(queue, state, ranges, node);
          break;
        case "Task":
          addTask(queue, state, ranges, node);
          break;
        case "HorizontalRule":
          addHorizontalRule(queue, ranges, node);
          break;
      }
    },
  });

  return queue.build();
}

function parseRequestFromUpdate(
  update: ViewUpdate,
): MarkdownPreviewParseRequest | undefined {
  for (const tr of update.transactions) {
    for (const effect of tr.effects) {
      if (effect.is(refreshMarkdownPreviewEffect)) {
        return effect.value;
      }
    }
  }
  return undefined;
}

function parseUptoForRequest(
  view: EditorView,
  request: MarkdownPreviewParseRequest,
): number {
  const { state, viewport } = view;
  if (request.fullDocument) return state.doc.length;
  return Math.min(state.doc.length, Math.max(viewport.to, 0) + 8192);
}

export function markdownLivePreview() {
  return ViewPlugin.fromClass(
    class {
      decorations: DecorationSet = Decoration.none;
      private refreshQueued = false;
      private pendingParse: MarkdownPreviewParseRequest | undefined;

      constructor(readonly view: EditorView) {
        this.pendingParse = {};
        this.scheduleRefresh();
      }

      update(update: ViewUpdate) {
        const parseRequest = parseRequestFromUpdate(update);
        if (update.docChanged || parseRequest !== undefined) {
          this.pendingParse = parseRequest ?? {};
        }
        if (update.docChanged || update.selectionSet || parseRequest !== undefined) {
          this.scheduleRefresh();
        }
      }

      private scheduleRefresh() {
        if (this.refreshQueued) return;
        this.refreshQueued = true;
        queueMicrotask(() => {
          this.refreshQueued = false;
          if (this.view.isDestroyed) return;
          this.applyRefresh();
        });
      }

      private applyRefresh() {
        const { state } = this.view;

        if (state.doc.length > 0 && this.pendingParse !== undefined) {
          const request = this.pendingParse;
          this.pendingParse = undefined;
          const parseUpto = parseUptoForRequest(this.view, request);
          const parseBudget = request.fullDocument ? 2000 : 500;
          forceParsing(this.view, parseUpto, parseBudget);
        }

        try {
          this.decorations = buildLivePreviewDecorations(this.view.state);
        } catch (error) {
          console.error("Markdown live preview failed:", error);
          this.decorations = Decoration.none;
        }

        // Publish decoration changes after async parse (microtask runs outside update).
        this.view.dispatch({});
      }
    },
    { decorations: (plugin) => plugin.decorations },
  );
}
