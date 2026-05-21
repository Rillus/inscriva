export type DiffLineType = "same" | "add" | "remove";

export interface DiffLine {
  type: DiffLineType;
  text: string;
}

function splitLines(text: string): string[] {
  if (text === "") return [];
  return text.split("\n");
}

/** Longest common subsequence length table for line arrays. */
function lcsTable(a: string[], b: string[]): number[][] {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const table: number[][] = Array.from({ length: rows }, () =>
    Array(cols).fill(0),
  );

  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      if (a[i - 1] === b[j - 1]) {
        table[i][j] = table[i - 1][j - 1] + 1;
      } else {
        table[i][j] = Math.max(table[i - 1][j], table[i][j - 1]);
      }
    }
  }

  return table;
}

/**
 * Line-based diff using LCS. Returns a flat list of lines tagged same/add/remove.
 */
export function computeLineDiff(before: string, after: string): DiffLine[] {
  const left = splitLines(before);
  const right = splitLines(after);

  if (left.length === 0 && right.length === 0) return [];

  const table = lcsTable(left, right);
  const result: DiffLine[] = [];
  let i = left.length;
  let j = right.length;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && left[i - 1] === right[j - 1]) {
      result.push({ type: "same", text: left[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || table[i][j - 1] >= table[i - 1][j])) {
      result.push({ type: "add", text: right[j - 1] });
      j--;
    } else {
      result.push({ type: "remove", text: left[i - 1] });
      i--;
    }
  }

  return result.reverse();
}
