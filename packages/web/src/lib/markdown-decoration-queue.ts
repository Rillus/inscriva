import { RangeSetBuilder } from "@codemirror/state";
import { Decoration, type DecorationSet } from "@codemirror/view";

type QueuedDecoration = {
  from: number;
  to: number;
  deco: Decoration;
};

/** Collects decorations and applies them in document order for CodeMirror. */
export class MarkdownDecorationQueue {
  private readonly spans: QueuedDecoration[] = [];

  hide(from: number, to: number) {
    this.mark(from, to, "cm-md-mark-hidden");
  }

  mark(from: number, to: number, className: string) {
    if (from >= to) return;
    this.spans.push({
      from,
      to,
      deco: Decoration.mark({ class: className }),
    });
  }

  build(): DecorationSet {
    if (this.spans.length === 0) return Decoration.none;

    const builder = new RangeSetBuilder<Decoration>();
    this.spans.sort((a, b) => {
      if (a.from !== b.from) return a.from - b.from;
      return a.deco.startSide - b.deco.startSide;
    });
    for (const span of this.spans) {
      builder.add(span.from, span.to, span.deco);
    }
    return builder.finish();
  }
}
