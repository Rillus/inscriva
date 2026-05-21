/** Column alignment inferred from GFM delimiter row. */
export type PipeColumnAlign = "left" | "center" | "right";

export type ParsedPipeTable = {
  /** Header row cell text (no outer pipes). */
  header: string[];
  /** Body rows; each row has same length as header (padded). */
  rows: string[][];
  aligns: PipeColumnAlign[];
};

function splitPipeRow(line: string): string[] {
  const t = line.trim();
  if (!t.includes("|")) return [];
  let inner = t;
  if (inner.startsWith("|")) inner = inner.slice(1);
  if (inner.endsWith("|")) inner = inner.slice(0, -1);
  return inner.split("|").map((c) => c.trim());
}

function parseDelimiterCells(cells: string[]): PipeColumnAlign[] {
  return cells.map((cell) => {
    const s = cell.trim();
    const left = s.startsWith(":");
    const right = s.endsWith(":");
    if (left && right) return "center";
    if (right) return "right";
    return "left";
  });
}

function isDelimiterRow(cells: string[]): boolean {
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{2,}:?$/.test(c.trim()));
}

/** Parse a GFM pipe table from a markdown slice (may include trailing newline). */
export function parsePipeTable(text: string): ParsedPipeTable | null {
  const lines = text.trimEnd().split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return null;

  const header = splitPipeRow(lines[0]!);
  if (header.length === 0) return null;

  const delimCells = splitPipeRow(lines[1]!);
  if (!isDelimiterRow(delimCells)) return null;
  if (delimCells.length !== header.length) return null;

  const aligns = parseDelimiterCells(delimCells);
  const rows: string[][] = [];

  for (let i = 2; i < lines.length; i++) {
    const cells = splitPipeRow(lines[i]!);
    if (cells.length === 0) continue;
    const row = [...cells];
    while (row.length < header.length) row.push("");
    if (row.length > header.length) row.length = header.length;
    rows.push(row);
  }

  return { header, rows, aligns };
}

function alignCell(align: PipeColumnAlign): string {
  switch (align) {
    case "center":
      return ":---:";
    case "right":
      return "---:";
    default:
      return "---";
  }
}

/** Serialise a parsed table back to GFM pipe markdown (no trailing newline). */
export function serializePipeTable(t: ParsedPipeTable): string {
  const cols = t.header.length;
  const rowLine = (cells: string[]) =>
    `| ${cells.map((c) => c.replace(/\|/g, "\\|")).join(" | ")} |`;

  const delim = `| ${t.aligns.slice(0, cols).map(alignCell).join(" | ")} |`;
  const body = t.rows.map(rowLine);
  return [rowLine(t.header), delim, ...body].join("\n");
}
