import type { InterpretedLlmError } from "./interpret-llm-error.js";

/** Build a DOM panel for an interpreted LLM error (CodeMirror widget or similar). */
export function buildLlmErrorPanel(
  error: InterpretedLlmError,
  onDismiss: () => void,
): HTMLElement {
  const panel = document.createElement("div");
  panel.className = "llm-error-panel";

  const title = document.createElement("h4");
  title.className = "llm-error-title";
  title.textContent = error.title;
  panel.append(title);

  const summary = document.createElement("p");
  summary.className = "llm-error-summary";
  summary.textContent = error.summary;
  panel.append(summary);

  if (error.hint) {
    const hint = document.createElement("p");
    hint.className = "llm-error-hint";
    hint.textContent = error.hint;
    panel.append(hint);
  }

  if (error.detail) {
    const details = document.createElement("details");
    details.className = "llm-error-details";
    const summaryEl = document.createElement("summary");
    summaryEl.textContent = "Technical details";
    const pre = document.createElement("pre");
    pre.textContent = error.detail;
    details.append(summaryEl, pre);
    panel.append(details);
  }

  const actions = document.createElement("div");
  actions.className = "llm-error-actions";
  const dismiss = document.createElement("button");
  dismiss.type = "button";
  dismiss.className = "llm-error-dismiss";
  dismiss.textContent = "Dismiss";
  dismiss.onclick = (ev) => {
    ev.preventDefault();
    onDismiss();
  };
  actions.append(dismiss);
  panel.append(actions);

  return panel;
}
