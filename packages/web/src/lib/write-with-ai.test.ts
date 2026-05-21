import { describe, expect, it } from "vitest";
import { EditorState, EditorSelection } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { isAtSentenceEnd } from "./sentence-bounds.js";
import {
  configureWriteWithAi,
  writeWithAiExtension,
  writeWithAiField,
} from "./write-with-ai.js";

function stateWithSelection(doc: string, from: number, to: number) {
  return EditorState.create({
    doc,
    selection: EditorSelection.range(from, to),
    extensions: [
      writeWithAiExtension(),
      configureWriteWithAi({
        enabled: true,
        generate: async function* () {
          yield "continued.";
        },
      }),
    ],
  });
}

function stateWithCaret(doc: string, pos: number) {
  return stateWithSelection(doc, pos, pos);
}

async function flushWriteWithAiSync(): Promise<void> {
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

describe("writeWithAiExtension", () => {
  it("shows an offer when the caret is at a sentence end", async () => {
    const doc = "The rain stopped.";
    const state = stateWithCaret(doc, doc.length);
    expect(isAtSentenceEnd(doc, doc.length)).toBe(true);

    const parent = document.createElement("div");
    const view = new EditorView({ state, parent });
    view.dispatch({ selection: { anchor: doc.length } });
    await flushWriteWithAiSync();

    expect(view.state.field(writeWithAiField)).toMatchObject({
      phase: "offer",
      anchor: { kind: "continue", to: doc.length },
    });

    view.destroy();
    parent.remove();
  });

  it("shows an offer for a non-empty selection", async () => {
    const doc = "The rain stopped.";
    const parent = document.createElement("div");
    const view = new EditorView({
      state: stateWithSelection(doc, 0, 8),
      parent,
    });
    await flushWriteWithAiSync();

    expect(view.state.field(writeWithAiField)).toMatchObject({
      phase: "offer",
      anchor: { kind: "selection", from: 0, to: 8, text: "The rain" },
    });

    view.destroy();
    parent.remove();
  });

  it("clears the offer when the caret leaves the sentence end", async () => {
    const doc = "The rain stopped.";
    const parent = document.createElement("div");
    const view = new EditorView({
      state: stateWithCaret(doc, doc.length),
      parent,
    });
    await flushWriteWithAiSync();

    view.dispatch({ selection: { anchor: 3 } });
    await flushWriteWithAiSync();
    expect(view.state.field(writeWithAiField)).toBeNull();

    view.destroy();
    parent.remove();
  });
});
