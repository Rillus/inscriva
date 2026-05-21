import { syntaxTree } from "@codemirror/language";
import {
  Facet,
  Prec,
  StateEffect,
  StateField,
  type EditorState,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  WidgetType,
  type ViewUpdate,
} from "@codemirror/view";
import { parsePipeTable, serializePipeTable, type ParsedPipeTable } from "./pipe-table.js";

/** When false (e.g. read mode), pipe tables stay as decorated markdown only. */
export const tableVisualModeFacet = Facet.define<boolean, boolean>({
  combine: (xs) => xs.some(Boolean),
});

const rawMarkdownTableEffect = StateEffect.define<{ from: number; to: number } | null>();

export function setMarkdownTableSource(view: EditorView, from: number, to: number): void {
  view.dispatch({
    effects: rawMarkdownTableEffect.of({ from, to }),
    selection: { anchor: from, head: from },
  });
  view.focus();
}

export function clearMarkdownTableSource(view: EditorView): void {
  view.dispatch({ effects: rawMarkdownTableEffect.of(null) });
}

const rawMarkdownTableField = StateField.define<{ from: number; to: number } | null>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(rawMarkdownTableEffect)) return e.value;
    }
    let next = value;
    if (next && tr.docChanged) {
      const from = tr.changes.mapPos(next.from, 1);
      const to = tr.changes.mapPos(next.to, -1);
      next = from < to ? { from, to } : null;
    }
    if (next && tr.changes.empty && !tr.startState.selection.eq(tr.state.selection)) {
      const h = tr.state.selection.main.head;
      if (h < next.from || h > next.to) next = null;
    }
    return next;
  },
});

function tableDomToParsed(root: HTMLElement): ParsedPipeTable | null {
  const table = root.querySelector("table.cm-md-table-html");
  if (!table) return null;
  const ths = [...table.querySelectorAll("thead th")];
  const header = ths.map((th) => normaliseCellText(th.textContent ?? ""));
  if (header.length === 0) return null;

  let aligns: ParsedPipeTable["aligns"] = header.map(() => "left");
  const rawAligns = root.dataset.tableAligns;
  if (rawAligns) {
    try {
      const parsed = JSON.parse(rawAligns) as ParsedPipeTable["aligns"];
      if (Array.isArray(parsed) && parsed.length === header.length) aligns = parsed;
    } catch {
      /* keep default */
    }
  }

  const rows = [...table.querySelectorAll("tbody tr")].map((tr) =>
    [...tr.querySelectorAll("td")].map((td) => normaliseCellText(td.textContent ?? "")),
  );

  while (rows.length > 0 && rows[rows.length - 1]!.every((c) => c === "")) {
    rows.pop();
  }

  for (const row of rows) {
    while (row.length < header.length) row.push("");
    if (row.length > header.length) row.length = header.length;
  }

  return { header, rows, aligns };
}

function normaliseCellText(s: string): string {
  return s.replace(/\r\n/g, "\n").trim();
}

class PipeTableWidget extends WidgetType {
  constructor(
    readonly from: number,
    readonly to: number,
  ) {
    super();
  }

  override eq(other: PipeTableWidget): boolean {
    return other.from === this.from && other.to === this.to;
  }

  override get estimatedHeight(): number {
    const lineCount = Math.max(2, this.to - this.from > 0 ? (this.to - this.from) / 32 : 4);
    return Math.min(480, 36 + lineCount * 26);
  }

  override ignoreEvent(): boolean {
    return false;
  }

  override toDOM(view: EditorView): HTMLElement {
    const editable = view.state.facet(tableVisualModeFacet);
    const root = document.createElement("div");
    root.className = "cm-md-table-panel";

    const toolbar = document.createElement("div");
    toolbar.className = "cm-md-table-toolbar";

    const mdBtn = document.createElement("button");
    mdBtn.type = "button";
    mdBtn.className = "cm-md-table-src-btn";
    mdBtn.textContent = "Markdown source";
    mdBtn.setAttribute("aria-label", "Edit this table as raw Markdown");
    mdBtn.onclick = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      setMarkdownTableSource(view, this.from, this.to);
    };
    toolbar.appendChild(mdBtn);
    root.appendChild(toolbar);

    const slice = view.state.doc.sliceString(this.from, this.to);
    const parsed = parsePipeTable(slice);

    if (parsed) {
      const table = document.createElement("table");
      table.className = "cm-md-table-html";
      root.dataset.tableAligns = JSON.stringify(parsed.aligns);
      const thead = document.createElement("thead");
      const trh = document.createElement("tr");
      for (const h of parsed.header) {
        const th = document.createElement("th");
        th.textContent = h;
        if (editable) th.contentEditable = "true";
        trh.appendChild(th);
      }
      thead.appendChild(trh);
      table.appendChild(thead);
      const tbody = document.createElement("tbody");
      for (const row of parsed.rows) {
        const tr = document.createElement("tr");
        for (const cell of row) {
          const td = document.createElement("td");
          td.textContent = cell;
          if (editable) td.contentEditable = "true";
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      table.appendChild(tbody);
      root.appendChild(table);

      let debounce: ReturnType<typeof window.setTimeout> | undefined;
      const sync = () => {
        if (!editable) return;
        const next = tableDomToParsed(root);
        if (!next) return;
        const md = serializePipeTable(next);
        const cur = view.state.doc.sliceString(this.from, this.to);
        if (md === cur) return;
        view.dispatch({
          changes: { from: this.from, to: this.to, insert: md },
        });
      };

      const schedule = () => {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(sync, 150);
      };

      if (editable) {
        root.addEventListener("input", schedule);
        root.addEventListener(
          "focusout",
          () => {
            window.clearTimeout(debounce);
            sync();
          },
          true,
        );
      }
    } else {
      const pre = document.createElement("pre");
      pre.className = "cm-md-table-parse-fallback";
      pre.textContent = slice;
      root.appendChild(pre);
    }

    return root;
  }
}

function buildTableReplaceDecorations(state: EditorState): DecorationSet {
  if (!state.facet(tableVisualModeFacet)) return Decoration.none;

  const raw = state.field(rawMarkdownTableField);
  const decos: { from: number; to: number; value: Decoration }[] = [];

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "Table") return;
      if (raw && raw.from === node.from && raw.to === node.to) return;
      decos.push({
        from: node.from,
        to: node.to,
        value: Decoration.replace({
          widget: new PipeTableWidget(node.from, node.to),
          block: true,
        }),
      });
    },
  });

  return Decoration.set(decos, true);
}

const tableDecorationField = StateField.define<DecorationSet>({
  create(state) {
    return buildTableReplaceDecorations(state);
  },
  update(_, tr) {
    return buildTableReplaceDecorations(tr.state);
  },
  provide: (f) => EditorView.decorations.from(f),
});

class RawTableFloatPlugin {
  readonly dom: HTMLDivElement;

  constructor(readonly view: EditorView) {
    this.dom = document.createElement("div");
    this.dom.className = "cm-md-table-raw-float";
    this.dom.hidden = true;
    this.dom.style.position = "absolute";
    this.dom.style.zIndex = "4";
    this.view.scrollDOM.appendChild(this.dom);
  }

  update(u: ViewUpdate): void {
    if (!u.state.facet(tableVisualModeFacet)) {
      this.dom.hidden = true;
      return;
    }
    const raw = u.state.field(rawMarkdownTableField);

    if (!raw) {
      this.dom.hidden = true;
      return;
    }
    const head = u.state.selection.main.head;
    if (head < raw.from || head > raw.to) {
      this.dom.hidden = true;
      return;
    }
    const c = u.view.coordsAtPos(raw.from);
    if (!c) {
      this.dom.hidden = true;
      return;
    }
    const scroller = u.view.scrollDOM;
    const sr = scroller.getBoundingClientRect();
    this.dom.hidden = false;
    this.dom.style.top = `${c.top - sr.top + scroller.scrollTop}px`;
    this.dom.style.right = "10px";

    if (this.dom.childElementCount === 0) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cm-md-table-visual-btn";
      b.textContent = "Visual table";
      b.setAttribute("aria-label", "Show this table as an HTML grid");
      b.onclick = (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        clearMarkdownTableSource(u.view);
        u.view.focus();
      };
      this.dom.appendChild(b);
    }
  }

  destroy(): void {
    this.dom.remove();
  }
}

const rawTableFloatPlugin = ViewPlugin.fromClass(RawTableFloatPlugin);

export function markdownTableVisual(): Extension {
  return Prec.highest([
    rawMarkdownTableField,
    tableDecorationField,
    rawTableFloatPlugin,
  ]);
}
