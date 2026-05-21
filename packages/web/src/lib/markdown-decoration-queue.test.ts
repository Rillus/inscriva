import { describe, expect, it } from "vitest";
import { EditorState, EditorSelection } from "@codemirror/state";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { buildLivePreviewDecorations } from "./markdown-live-preview.js";

describe("buildLivePreviewDecorations ordering", () => {
  it("does not throw for documents with tables and links", () => {
    const doc = [
      "# Title",
      "",
      "See [link](https://example.com) here.",
      "",
      "| a | b |",
      "|---|---|",
      "| 1 | 2 |",
    ].join("\n");

    const state = EditorState.create({
      doc,
      extensions: [markdown({ base: markdownLanguage })],
      selection: EditorSelection.cursor(doc.length),
    });

    expect(() => buildLivePreviewDecorations(state)).not.toThrow();
  });
});
