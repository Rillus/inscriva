import fs from "node:fs/promises";
import path from "node:path";

export async function readBookFileContent(fullPath: string): Promise<string> {
  try {
    return await fs.readFile(fullPath, "utf-8");
  } catch (err) {
    if (isEnoent(err)) return "";
    throw err;
  }
}

export async function ensureNotesFile(bookRoot: string): Promise<void> {
  const notesDir = path.join(bookRoot, ".inscriva", "notes");
  await fs.mkdir(notesDir, { recursive: true });
  const notesPath = path.join(notesDir, "notes.jsonl");
  try {
    await fs.access(notesPath);
  } catch (err) {
    if (!isEnoent(err)) throw err;
    await fs.writeFile(notesPath, "", "utf-8");
  }
}

function isEnoent(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === "ENOENT"
  );
}
