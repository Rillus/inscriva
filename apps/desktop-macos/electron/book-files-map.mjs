/**
 * Build markdown/json book file map from an open book (matches dev-bridge filters).
 * @param {{ listFiles: () => string[], readFile: (rel: string) => string }} bookFs
 * @returns {Map<string, string>}
 */
export function loadBookFilesMap(bookFs) {
  const files = new Map();
  for (const rel of bookFs.listFiles()) {
    if (!/\.(md|json|jsonl)$/i.test(rel)) continue;
    try {
      files.set(rel, bookFs.readFile(rel));
    } catch {
      /* skip unreadable */
    }
  }
  return files;
}