import { describe, expect, it } from "vitest";
import { EditorState, EditorSelection } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { markdownLivePreview } from "./markdown-live-preview.js";
import { EditorView } from "@codemirror/view";
import {
  buildLivePreviewDecorations,
  cursorTouchesRange,
  isMarkdownPreviewReady,
  refreshMarkdownPreview,
} from "./markdown-live-preview.js";
import { delimitedMarkRanges, syntaxNodeAtSpan } from "./markdown-syntax.js";

function gfmState(
  doc: string,
  selection: ReturnType<typeof EditorSelection.cursor>,
) {
  return EditorState.create({
    doc,
    extensions: [markdown({ base: markdownLanguage })],
    selection,
  });
}

function decorationCount(state: EditorState): number {
  let count = 0;
  buildLivePreviewDecorations(state).between(0, state.doc.length, () => {
    count++;
  });
  return count;
}

function hiddenCount(state: EditorState): number {
  let count = 0;
  buildLivePreviewDecorations(state).between(0, state.doc.length, (_f, _t, deco) => {
    if (deco.spec.class === "cm-md-mark-hidden") count++;
  });
  return count;
}

describe("cursorTouchesRange", () => {
  it("returns true when the cursor is inside the range", () => {
    expect(
      cursorTouchesRange([{ from: 5, to: 5 }], { from: 0, to: 10 }),
    ).toBe(true);
  });

  it("returns false when the cursor is outside the range", () => {
    expect(
      cursorTouchesRange([{ from: 20, to: 20 }], { from: 0, to: 10 }),
    ).toBe(false);
  });
});

describe("delimitedMarkRanges", () => {
  it("finds emphasis marks for italic and bold spans", () => {
    const state = gfmState("*italic* and **bold**", EditorSelection.cursor(0));

    const em = syntaxNodeAtSpan(state, 0, 8, "Emphasis");
    const strong = syntaxNodeAtSpan(state, 13, 21, "StrongEmphasis");
    expect(delimitedMarkRanges(em!, "EmphasisMark")?.contentFrom).toBe(1);
    expect(delimitedMarkRanges(strong!, "EmphasisMark")?.contentFrom).toBe(15);
  });
});

describe("isMarkdownPreviewReady", () => {
  it("is ready for an empty document", () => {
    const state = gfmState("", EditorSelection.cursor(0));
    expect(isMarkdownPreviewReady(state)).toBe(true);
  });

  it("is ready once GFM has parsed a short document", () => {
    const state = gfmState("# Title", EditorSelection.cursor(0));
    expect(isMarkdownPreviewReady(state)).toBe(true);
  });

  it("is ready with a partial parse (does not require the full document)", () => {
    const doc = "# Title\n\n" + "Line with **bold**.\n\n".repeat(100);
    const state = gfmState(doc, EditorSelection.cursor(0));
    expect(isMarkdownPreviewReady(state)).toBe(true);
  });
});

describe("buildLivePreviewDecorations", () => {
  it("adds preview decorations when the cursor is outside formatted text", () => {
    const state = gfmState("Hello **Agricole** there", EditorSelection.cursor(0));
    expect(decorationCount(state)).toBeGreaterThan(0);
    expect(hiddenCount(state)).toBeGreaterThan(0);
  });

  it("hides delimiter decorations while the cursor is inside the span", () => {
    const state = gfmState("**Agricole**", EditorSelection.cursor(5));
    expect(hiddenCount(state)).toBe(0);
  });

  it("decorates headings and hides hash marks when the cursor is outside", () => {
    const doc = "# Title\n\nBody";
    const state = gfmState(doc, EditorSelection.cursor(doc.length));
    expect(hiddenCount(state)).toBeGreaterThan(0);
    let hasH1 = false;
    buildLivePreviewDecorations(state).between(0, state.doc.length, (_f, _t, deco) => {
      if (deco.spec.class === "cm-md-h1") hasH1 = true;
    });
    expect(hasH1).toBe(true);
  });

  it("hides the space after hash marks when the heading is inactive", () => {
    const doc = "# Title";
    const state = gfmState(doc, EditorSelection.cursor(doc.length));
    let hidesHeadingGap = false;
    buildLivePreviewDecorations(state).between(0, state.doc.length, (from, to, deco) => {
      if (deco.spec.class === "cm-md-mark-hidden" && from === 1 && to === 2) {
        hidesHeadingGap = true;
      }
    });
    expect(hidesHeadingGap).toBe(true);
  });

  it("does not throw for mixed block and inline markdown", () => {
    const doc = "> quote\n\n**bold** and [x](y)\n\n| h |\n|---|";
    const state = gfmState(doc, EditorSelection.cursor(0));
    expect(() => buildLivePreviewDecorations(state)).not.toThrow();
  });

  it("decorates tables and hides pipe delimiters when inactive", () => {
    const doc = "| a | b |\n|---|---|\n| 1 | 2 |";
    const state = gfmState(doc, EditorSelection.cursor(doc.length));
    expect(hiddenCount(state)).toBeGreaterThan(0);
  });

  it("hides strikethrough tildes when inactive", () => {
    const doc = "~~gone~~";
    const state = gfmState(doc, EditorSelection.cursor(doc.length));
    expect(hiddenCount(state)).toBeGreaterThan(0);
  });

  it("refreshMarkdownPreview rebuilds live-preview decorations", async () => {
    const doc = "Hello **world**";
    const state = gfmState(doc, EditorSelection.cursor(doc.length));
    const parent = document.createElement("div");
    const view = new EditorView({
      state,
      parent,
      extensions: [markdown({ base: markdownLanguage }), markdownLivePreview()],
    });

    refreshMarkdownPreview(view, { fullDocument: true });
    await new Promise<void>((resolve) => queueMicrotask(() => queueMicrotask(resolve)));
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    expect(hiddenCount(view.state)).toBeGreaterThan(0);
    view.destroy();
  });

  it("decorates blockquotes, fenced code, tasks, and horizontal rules", () => {
    const doc = "> quote\n\n```js\ncode\n```\n\n- [ ] todo\n\n---\n";
    const state = gfmState(doc, EditorSelection.cursor(doc.length));
    const classes = new Set<string>();
    buildLivePreviewDecorations(state).between(0, state.doc.length, (_f, _t, deco) => {
      if (deco.spec.class) classes.add(deco.spec.class);
    });
    expect(classes.has("cm-md-blockquote")).toBe(true);
    expect(classes.has("cm-md-fenced-code")).toBe(true);
    expect(classes.has("cm-md-hr")).toBe(true);
    expect(hiddenCount(state)).toBeGreaterThan(0);
  });

  it("renders a styled horizontal rule when the cursor is outside it", () => {
    const doc = "Before\n\n---\n\nAfter";
    const hrFrom = doc.indexOf("---");
    const state = gfmState(doc, EditorSelection.cursor(0));
    let hasHr = false;
    let hidesHrMarkup = false;
    buildLivePreviewDecorations(state).between(0, state.doc.length, (from, to, deco) => {
      if (deco.spec.class === "cm-md-hr") hasHr = true;
      if (
        deco.spec.class === "cm-md-mark-hidden" &&
        from === hrFrom &&
        to === hrFrom + 3
      ) {
        hidesHrMarkup = true;
      }
    });
    expect(hasHr).toBe(true);
    expect(hidesHrMarkup).toBe(false);
  });

  it("shows raw --- markup while the cursor is on a horizontal rule", () => {
    const doc = "Before\n\n---\n\nAfter";
    const hrFrom = doc.indexOf("---");
    const state = gfmState(doc, EditorSelection.cursor(hrFrom + 1));
    let hasHr = false;
    let hidesHrMarkup = false;
    buildLivePreviewDecorations(state).between(0, state.doc.length, (from, to, deco) => {
      if (deco.spec.class === "cm-md-hr") hasHr = true;
      if (
        deco.spec.class === "cm-md-mark-hidden" &&
        from === hrFrom &&
        to === hrFrom + 3
      ) {
        hidesHrMarkup = true;
      }
    });
    expect(hasHr).toBe(false);
    expect(hidesHrMarkup).toBe(false);
  });

});
