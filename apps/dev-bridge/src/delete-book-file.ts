import fs from "node:fs/promises";
import { anchorSidecarPath } from "./rename-book-file.js";

export async function deleteBookFile(
  root: string,
  filePath: string,
  safePath: (root: string, rel: string) => string,
): Promise<void> {
  const full = safePath(root, filePath);
  try {
    await fs.access(full);
  } catch {
    throw new Error(`File not found: ${filePath}`);
  }

  await fs.unlink(full);

  const sidecarFull = safePath(root, anchorSidecarPath(filePath));
  try {
    await fs.unlink(sidecarFull);
  } catch {
    /* no sidecar */
  }
}
