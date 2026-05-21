import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ensureNotesFile, readBookFileContent } from "./book-files.js";

describe("readBookFileContent", () => {
  it("returns empty string when the file does not exist", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-"));
    const missing = path.join(dir, "does-not-exist.md");
    await expect(readBookFileContent(missing)).resolves.toBe("");
  });

  it("returns file contents when the file exists", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-"));
    const file = path.join(dir, "chapter.md");
    await fs.writeFile(file, "# Hello\n", "utf-8");
    await expect(readBookFileContent(file)).resolves.toBe("# Hello\n");
  });
});

describe("ensureNotesFile", () => {
  it("creates an empty notes file when missing", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-"));
    await ensureNotesFile(root);
    const notesPath = path.join(root, ".inscriva", "notes", "notes.jsonl");
    await expect(fs.readFile(notesPath, "utf-8")).resolves.toBe("");
  });

  it("does not overwrite existing notes", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-"));
    const notesPath = path.join(root, ".inscriva", "notes", "notes.jsonl");
    await fs.mkdir(path.dirname(notesPath), { recursive: true });
    await fs.writeFile(notesPath, '{"id":"n1"}\n', "utf-8");
    await ensureNotesFile(root);
    await expect(fs.readFile(notesPath, "utf-8")).resolves.toBe('{"id":"n1"}\n');
  });
});
