import {
  Facet,
  Prec,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import {
  EditorView,
  ViewPlugin,
  keymap,
  type ViewUpdate,
} from "@codemirror/view";
import {
  interpretLlmError,
  tryInterpretStreamedLlmError,
  type InterpretedLlmError,
} from "./interpret-llm-error.js";
import { buildLlmErrorPanel } from "./llm-error-panel.js";
import {
  anchorStillValid,
  defaultIntentForSelection,
  detectWriteWithAiAnchor,
  type WriteWithAiAnchor,
  type WriteWithAiIntent,
} from "./write-with-ai-context.js";

export type WriteWithAiGenerateContext = {
  kind: "continue" | "prompt" | "expand" | "rewrite";
  from: number;
  to: number;
  /** Sentence or selected passage text. */
  text: string;
  /** Extra author instruction (optional for prompt/expand; required for rewrite/continue). */
  prompt: string;
  maxOutputTokens?: number;
};

export type WriteWithAiGenerate = (
  context: WriteWithAiGenerateContext,
) => AsyncIterable<string>;

export type WriteWithAiConfig = {
  enabled: boolean;
  generate: WriteWithAiGenerate | null;
};

export const writeWithAiConfigFacet = Facet.define<
  WriteWithAiConfig,
  WriteWithAiConfig
>({
  combine: (values) =>
    values[values.length - 1] ?? { enabled: false, generate: null },
});

export type WriteWithAiPhase = "offer" | "prompt" | "generating" | "error";

export type WriteWithAiState = {
  anchor: WriteWithAiAnchor;
  phase: WriteWithAiPhase;
  intent: WriteWithAiIntent;
  buttonFocused: boolean;
  error?: InterpretedLlmError;
};

const setWriteWithAiEffect = StateEffect.define<WriteWithAiState | null>();
const focusWriteWithAiButtonEffect = StateEffect.define<boolean>();

function anchorFromState(state: WriteWithAiState): WriteWithAiAnchor {
  return state.anchor;
}

export const writeWithAiField = StateField.define<WriteWithAiState | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const effect of tr.effects) {
      if (effect.is(setWriteWithAiEffect)) return effect.value;
      if (effect.is(focusWriteWithAiButtonEffect) && value) {
        return { ...value, buttonFocused: effect.value };
      }
    }
    if (!value) return null;

    const anchor = anchorFromState(value);
    if (tr.docChanged) {
      const from = tr.changes.mapPos(anchor.from, 1);
      const to = tr.changes.mapPos(anchor.to, -1);
      const doc = tr.state.doc.toString();
      if (!anchorStillValid(doc, from, to, anchor.kind)) return null;
      return {
        ...value,
        anchor: { ...anchor, from, to },
      };
    }

    if (tr.selection) {
      const { from, to } = tr.state.selection.main;
      const doc = tr.state.doc.toString();
      if (!anchorStillValid(doc, from, to, anchor.kind)) return null;
    }

    return value;
  },
});

export function closeWriteWithAi(view: EditorView): void {
  view.dispatch({ effects: setWriteWithAiEffect.of(null) });
  view.focus();
}

function syncWriteWithAiState(view: EditorView): void {
  const config = view.state.facet(writeWithAiConfigFacet);
  if (!config.enabled || !config.generate) {
    if (view.state.field(writeWithAiField)) {
      view.dispatch({ effects: setWriteWithAiEffect.of(null) });
    }
    return;
  }

  const { from, to } = view.state.selection.main;
  const doc = view.state.doc.toString();
  const detected = detectWriteWithAiAnchor(doc, from, to);
  const current = view.state.field(writeWithAiField);

  if (!detected) {
    if (current) view.dispatch({ effects: setWriteWithAiEffect.of(null) });
    return;
  }

  if (
    current &&
    current.phase !== "offer" &&
    current.anchor.from === detected.from &&
    current.anchor.to === detected.to &&
    current.anchor.kind === detected.kind
  ) {
    return;
  }

  if (
    !current ||
    current.anchor.from !== detected.from ||
    current.anchor.to !== detected.to ||
    current.anchor.kind !== detected.kind
  ) {
    view.dispatch({
      effects: setWriteWithAiEffect.of({
        anchor: detected,
        phase: "offer",
        intent:
          detected.kind === "selection"
            ? defaultIntentForSelection(detected.text)
            : "expand",
        buttonFocused: false,
      }),
    });
  }
}

function focusWriteWithAiButton(view: EditorView): boolean {
  const state = view.state.field(writeWithAiField);
  if (!state || state.phase !== "offer") return false;
  view.dispatch({ effects: focusWriteWithAiButtonEffect.of(true) });
  view.dom.querySelector<HTMLButtonElement>(".cm-write-with-ai-btn")?.focus();
  return true;
}

function openWriteWithAiPrompt(view: EditorView): void {
  const state = view.state.field(writeWithAiField);
  if (!state) return;
  view.dispatch({
    effects: setWriteWithAiEffect.of({
      ...state,
      phase: "prompt",
      buttonFocused: false,
    }),
  });
}

function resolveGenerateKind(
  anchor: WriteWithAiAnchor,
  intent: WriteWithAiIntent,
): WriteWithAiGenerateContext["kind"] {
  if (anchor.kind === "continue") return "continue";
  return intent;
}

async function submitWriteWithAi(
  view: EditorView,
  prompt: string,
  intent: WriteWithAiIntent,
): Promise<void> {
  const config = view.state.facet(writeWithAiConfigFacet);
  const state = view.state.field(writeWithAiField);
  if (!state || !config.generate) return;

  const { anchor } = state;
  const kind = resolveGenerateKind(anchor, intent);

  if (kind === "prompt" && !prompt.trim() && anchor.kind === "selection") {
    prompt = "";
  } else if (
    (kind === "continue" || kind === "rewrite") &&
    !prompt.trim()
  ) {
    closeWriteWithAi(view);
    return;
  }

  view.dispatch({
    effects: setWriteWithAiEffect.of({ ...state, phase: "generating", intent }),
  });

  let generated = "";
  try {
    for await (const chunk of config.generate({
      kind,
      from: anchor.from,
      to: anchor.to,
      text: anchor.text,
      prompt: prompt.trim(),
    })) {
      generated += chunk;
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "AI writing failed. Try again.";
    view.dispatch({
      effects: setWriteWithAiEffect.of({
        ...state,
        phase: "error",
        error: interpretLlmError(message),
      }),
    });
    return;
  }

  const streamedError = tryInterpretStreamedLlmError(generated);
  if (streamedError) {
    view.dispatch({
      effects: setWriteWithAiEffect.of({
        ...state,
        phase: "error",
        error: streamedError,
      }),
    });
    return;
  }

  const insert = generated.trim();
  if (!insert) {
    closeWriteWithAi(view);
    return;
  }

  if (kind === "continue") {
    const pos = view.state.field(writeWithAiField)?.anchor.to ?? anchor.to;
    const prefix = view.state.doc.sliceString(0, pos);
    const needsSpace =
      prefix.length > 0 && !/\s$/.test(prefix) && !/^\s/.test(insert);
    view.dispatch({
      effects: setWriteWithAiEffect.of(null),
      changes: { from: pos, insert: (needsSpace ? " " : "") + insert },
      selection: { anchor: pos + (needsSpace ? 1 : 0) + insert.length },
    });
  } else {
    const current = view.state.field(writeWithAiField)?.anchor ?? anchor;
    view.dispatch({
      effects: setWriteWithAiEffect.of(null),
      changes: { from: current.from, to: current.to, insert },
      selection: { anchor: current.from + insert.length },
    });
  }
  view.focus();
}

class WriteWithAiPlugin {
  readonly dom: HTMLDivElement;
  private renderKey = "";

  constructor(readonly view: EditorView) {
    this.dom = document.createElement("div");
    this.dom.className = "cm-write-with-ai";
    this.dom.hidden = true;
    this.view.scrollDOM.appendChild(this.dom);
    queueWriteWithAiSync(view);
  }

  update(u: ViewUpdate): void {
    const state = u.state.field(writeWithAiField);
    const config = u.state.facet(writeWithAiConfigFacet);

    if (!state || !config.enabled) {
      this.dom.hidden = true;
      this.renderKey = "";
      return;
    }

    const anchorPos = state.anchor.to;

    u.view.requestMeasure({
      key: this,
      read: (view) => view.coordsAtPos(anchorPos, 1),
      write: (coords, view) => {
        if (!coords) {
          this.dom.hidden = true;
          return;
        }

        const scroller = view.scrollDOM;
        const sr = scroller.getBoundingClientRect();
        this.dom.hidden = false;
        this.dom.style.position = "absolute";
        this.dom.style.left = `${coords.left - sr.left + scroller.scrollLeft}px`;
        this.dom.style.top = `${coords.bottom - sr.top + scroller.scrollTop + 4}px`;
        this.dom.style.zIndex = "5";

        const key = `${state.anchor.from}:${state.anchor.to}:${state.anchor.kind}:${state.phase}:${state.intent}:${state.buttonFocused}:${state.error?.title ?? ""}`;
        if (key !== this.renderKey) {
          this.renderKey = key;
          this.render(view, state);
        } else if (state.buttonFocused) {
          view.dom.querySelector<HTMLButtonElement>(".cm-write-with-ai-btn")?.focus();
        }
      },
    });
  }

  private render(view: EditorView, state: WriteWithAiState): void {
    this.dom.replaceChildren();
    const { anchor } = state;

    if (state.phase === "offer") {
      const row = document.createElement("div");
      row.className = "cm-write-with-ai-offer";

      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "cm-write-with-ai-btn";
      btn.textContent = "Write with AI";
      btn.setAttribute(
        "aria-label",
        anchor.kind === "selection"
          ? "Write with AI using the selection"
          : "Write with AI at the cursor",
      );
      btn.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        openWriteWithAiPrompt(view);
      };
      btn.onkeydown = (ev) => {
        if (ev.key === "Enter" || ev.key === " ") {
          ev.preventDefault();
          openWriteWithAiPrompt(view);
        }
        if (ev.key === "Escape") closeWriteWithAi(view);
      };
      if (state.buttonFocused) btn.focus();

      const hint = document.createElement("span");
      hint.className = "cm-write-with-ai-hint";
      hint.textContent = "Tab";

      row.append(btn, hint);
      this.dom.append(row);
      return;
    }

    if (state.phase === "prompt") {
      const panel = document.createElement("div");
      panel.className = "cm-write-with-ai-prompt-panel";

      let intent = state.intent;

      if (anchor.kind === "selection") {
        const intentRow = document.createElement("div");
        intentRow.className = "cm-write-with-ai-intent";
        intentRow.setAttribute("role", "radiogroup");
        intentRow.setAttribute("aria-label", "How to use the selection");

        const addIntent = (value: WriteWithAiIntent, label: string) => {
          const labelEl = document.createElement("label");
          labelEl.className = "cm-write-with-ai-intent-option";
          const radio = document.createElement("input");
          radio.type = "radio";
          radio.name = "write-with-ai-intent";
          radio.value = value;
          radio.checked = intent === value;
          radio.onchange = () => {
            intent = value;
          };
          labelEl.append(radio, document.createTextNode(label));
          intentRow.append(labelEl);
        };

        addIntent("prompt", "Use selection as prompt");
        addIntent("expand", "Expand selection");
        addIntent("rewrite", "Rewrite with changes");
        panel.append(intentRow);
      }

      const input = document.createElement("input");
      input.type = "text";
      input.className = "cm-write-with-ai-prompt";
      input.placeholder =
        anchor.kind === "selection" && intent === "prompt"
          ? "Optional: add detail to your prompt…"
          : anchor.kind === "selection" && intent === "rewrite"
            ? "What should change? e.g. She reacts with surprise…"
            : anchor.kind === "selection"
              ? "Optional: how should this be expanded?"
              : "Describe what to write next…";
      input.setAttribute("aria-label", "Prompt for AI writing");

      const actions = document.createElement("div");
      actions.className = "cm-write-with-ai-prompt-actions";

      const submit = document.createElement("button");
      submit.type = "button";
      submit.className = "cm-write-with-ai-submit";
      submit.textContent = "Generate";

      const run = () => {
        const selectedIntent =
          panel.querySelector<HTMLInputElement>(
            'input[name="write-with-ai-intent"]:checked',
          )?.value ?? intent;
        const resolvedIntent = selectedIntent as WriteWithAiIntent;
        void submitWriteWithAi(view, input.value, resolvedIntent);
      };
      submit.onclick = (ev) => {
        ev.preventDefault();
        run();
      };

      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.className = "cm-write-with-ai-cancel";
      cancel.textContent = "Cancel";
      cancel.onclick = (ev) => {
        ev.preventDefault();
        closeWriteWithAi(view);
      };

      input.onkeydown = (ev) => {
        if (ev.key === "Enter") {
          ev.preventDefault();
          run();
        }
        if (ev.key === "Escape") {
          ev.preventDefault();
          closeWriteWithAi(view);
        }
      };

      actions.append(submit, cancel);
      panel.append(input, actions);
      this.dom.append(panel);
      requestAnimationFrame(() => input.focus());
      return;
    }

    if (state.phase === "generating") {
      const status = document.createElement("p");
      status.className = "cm-write-with-ai-status";
      status.textContent = "Writing…";
      this.dom.append(status);
      return;
    }

    if (state.phase === "error" && state.error) {
      this.dom.append(
        buildLlmErrorPanel(state.error, () => closeWriteWithAi(view)),
      );
    }
  }

  destroy(): void {
    this.dom.remove();
  }
}

const writeWithAiPanelPlugin = ViewPlugin.fromClass(WriteWithAiPlugin);

let writeWithAiSyncQueued = false;

function queueWriteWithAiSync(view: EditorView): void {
  if (writeWithAiSyncQueued) return;
  writeWithAiSyncQueued = true;
  requestAnimationFrame(() => {
    writeWithAiSyncQueued = false;
    syncWriteWithAiState(view);
  });
}

const writeWithAiSyncListener = EditorView.updateListener.of((update) => {
  if (update.docChanged || update.selectionSet) {
    queueWriteWithAiSync(update.view);
  }
});

const writeWithAiDomHandlers = EditorView.domEventHandlers({
  focusout(event, view) {
    const related = event.relatedTarget as Node | null;
    if (related && view.dom.contains(related)) return false;
    const state = view.state.field(writeWithAiField);
    if (state?.phase === "prompt" || state?.phase === "generating") return false;
    if (state) closeWriteWithAi(view);
    return false;
  },
});

export function writeWithAiExtension(): Extension {
  return Prec.high([
    writeWithAiField,
    writeWithAiSyncListener,
    writeWithAiDomHandlers,
    writeWithAiPanelPlugin,
    keymap.of([
      { key: "Tab", run: focusWriteWithAiButton },
      {
        key: "Escape",
        run: (view) => {
          if (view.state.field(writeWithAiField)) {
            closeWriteWithAi(view);
            return true;
          }
          return false;
        },
      },
    ]),
  ]);
}

export function configureWriteWithAi(config: WriteWithAiConfig): Extension {
  return writeWithAiConfigFacet.of(config);
}
