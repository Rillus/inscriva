import fs from "node:fs/promises";
import path from "node:path";

export function anchorSidecarPath(filePath: string): string {
  const safe = filePath.replace(/[/\\]/g, "__");
  return `.inscriva/anchors/${safe}.json`;
}

export async function renameBookFile(
  root: string,
  from: string,
  to: string,
  safePath: (root: string, rel: string) => string,
): Promise<void> {
  if (from === to) return;

  const oldFull = safePath(root, from);
  const newFull = safePath(root, to);

  try {
    await fs.access(newFull);
    throw new Error(`File already exists: ${to}`);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("File already exists")) {
      throw err;
    }
    /* destination does not exist — ok */
  }

  await fs.rename(oldFull, newFull);

  const oldSidecarRel = anchorSidecarPath(from);
  const newSidecarRel = anchorSidecarPath(to);
  const oldSidecarFull = safePath(root, oldSidecarRel);
  const newSidecarFull = safePath(root, newSidecarRel);

  try {
    const raw = await fs.readFile(oldSidecarFull, "utf-8");
    const data = JSON.parse(raw) as { file?: string };
    data.file = to;
    await fs.mkdir(path.dirname(newSidecarFull), { recursive: true });
    await fs.writeFile(newSidecarFull, JSON.stringify(data, null, 2), "utf-8");
    await fs.unlink(oldSidecarFull);
  } catch {
    /* no sidecar to move */
  }
}
