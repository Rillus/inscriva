import fs from "node:fs/promises";
import path from "node:path";
import { readBookFileContent } from "./book-files.js";

export async function loadBookFilesMap(
  root: string,
  listRelativePaths: (dir: string) => Promise<string[]>,
  safePath: (root: string, rel: string) => string,
): Promise<Map<string, string>> {
  const paths = await listRelativePaths(root);
  const files = new Map<string, string>();

  for (const rel of paths) {
    if (!/\.(md|json|jsonl)$/i.test(rel)) continue;
    const full = safePath(root, rel);
    try {
      const stat = await fs.stat(full);
      if (!stat.isFile()) continue;
      files.set(rel, await readBookFileContent(full));
    } catch {
      /* skip unreadable */
    }
  }

  return files;
}

export function safeBookPath(root: string, rel: string): string {
  const full = path.resolve(root, rel);
  if (!full.startsWith(path.resolve(root))) {
    throw new Error("Path escapes book root");
  }
  return full;
}
