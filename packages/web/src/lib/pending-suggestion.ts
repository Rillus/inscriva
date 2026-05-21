import {
  Compartment,
  Facet,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  EditorView,
  ViewPlugin,
  WidgetType,
  type DecorationSet,
} from "@codemirror/view";

export type PendingSuggestionRange = { from: number; to: number };

export const setPendingSuggestionEffect =
  StateEffect.define<PendingSuggestionRange | null>();

const pendingSuggestionField = StateField.define<PendingSuggestionRange | null>(
  {
    create() {
      return null;
    },
    update(value, tr) {
      for (const effect of tr.effects) {
        if (effect.is(setPendingSuggestionEffect)) return effect.value;
      }
      if (!value) return null;
      if (tr.docChanged) {
        return {
          from: tr.changes.mapPos(value.from, 1),
          to: tr.changes.mapPos(value.to, -1),
        };
      }
      return value;
    },
    provide: (field) =>
      EditorView.decorations.compute([field], (state) => {
        const pending = state.field(field);
        if (!pending || pending.from >= pending.to) return Decoration.none;
        return buildPendingDecorations(pending, state);
      }),
  },
);

function buildPendingDecorations(
  pending: PendingSuggestionRange,
  state: import("@codemirror/state").EditorState,
): DecorationSet {
  const handlers = state.facet(pendingSuggestionHandlersFacet);
  return Decoration.set([
    Decoration.mark({ class: "cm-ai-pending" }).range(pending.from, pending.to),
    Decoration.widget({
      widget: new PendingSuggestionControlsWidget(handlers),
      side: 1,
    }).range(pending.to),
  ]);
}

type PendingSuggestionHandlers = {
  onAccept: () => void;
  onReject: () => void;
};

const pendingSuggestionHandlersFacet = Facet.define<
  PendingSuggestionHandlers,
  PendingSuggestionHandlers
>({
  combine: (values) =>
    values[values.length - 1] ?? { onAccept: () => {}, onReject: () => {} },
});

class PendingSuggestionControlsWidget extends WidgetType {
  constructor(readonly handlers: PendingSuggestionHandlers) {
    super();
  }

  eq(other: PendingSuggestionControlsWidget): boolean {
    return other.handlers === this.handlers;
  }

  toDOM(view: EditorView): HTMLElement {
    const wrap = document.createElement("span");
    wrap.className = "cm-ai-pending-controls";
    wrap.setAttribute("role", "group");
    wrap.setAttribute("aria-label", "AI suggestion");

    const accept = document.createElement("button");
    accept.type = "button";
    accept.className = "cm-ai-pending-accept";
    accept.textContent = "Accept";
    accept.title = "Keep this text";
    accept.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      acceptPendingSuggestion(view, this.handlers.onAccept);
    };

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "cm-ai-pending-remove";
    remove.textContent = "Remove";
    remove.title = "Delete this text";
    remove.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      removePendingSuggestion(view, this.handlers.onReject);
    };

    wrap.append(accept, remove);
    return wrap;
  }

  ignoreEvent(): boolean {
    return false;
  }
}

export function acceptPendingSuggestion(
  view: EditorView,
  onAccept?: () => void,
): void {
  if (!view.state.field(pendingSuggestionField)) return;
  view.dispatch({ effects: setPendingSuggestionEffect.of(null) });
  onAccept?.();
}

export function removePendingSuggestion(
  view: EditorView,
  onReject?: () => void,
): void {
  const pending = view.state.field(pendingSuggestionField);
  if (!pending) return;
  view.dispatch({
    effects: setPendingSuggestionEffect.of(null),
    changes: { from: pending.from, to: pending.to, insert: "" },
  });
  onReject?.();
}

const pendingSuggestionCompartment = new Compartment();

export function pendingSuggestionExtension(
  handlers: PendingSuggestionHandlers,
): Extension {
  return pendingSuggestionCompartment.of([
    pendingSuggestionHandlersFacet.of(handlers),
    pendingSuggestionField,
    ViewPlugin.fromClass(
      class {
        constructor(readonly view: EditorView) {}

        update(update: import("@codemirror/view").ViewUpdate): void {
          if (
            update.docChanged &&
            update.state.field(pendingSuggestionField) &&
            !update.transactions.some((tr) =>
              tr.effects.some((e) => e.is(setPendingSuggestionEffect)),
            )
          ) {
            const pending = update.state.field(pendingSuggestionField);
            if (pending && pending.from >= pending.to) {
              update.view.dispatch({
                effects: setPendingSuggestionEffect.of(null),
              });
              handlers.onReject();
            }
          }
        }
      },
    ),
  ]);
}

export function setPendingSuggestionInView(
  view: EditorView,
  range: PendingSuggestionRange | null,
): void {
  view.dispatch({ effects: setPendingSuggestionEffect.of(range) });
}
