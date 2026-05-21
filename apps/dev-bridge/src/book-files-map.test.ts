import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadBookFilesMap, safeBookPath } from "./book-files-map.js";

describe("safeBookPath", () => {
  it("resolves paths inside the book root", () => {
    const root = "/books/demo";
    expect(safeBookPath(root, "chapter.md")).toContain("chapter.md");
  });

  it("rejects paths that escape the root", () => {
    expect(() => safeBookPath("/books/demo", "../../etc/passwd")).toThrow(
      "Path escapes book root",
    );
  });
});

describe("loadBookFilesMap", () => {
  it("loads markdown and json files from the book tree", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-book-"));
    await fs.mkdir(path.join(root, "00 Canon"), { recursive: true });
    await fs.writeFile(path.join(root, "00 Canon", "guide.md"), "# Guide", "utf-8");
    await fs.writeFile(path.join(root, "notes.txt"), "skip", "utf-8");

    const files = await loadBookFilesMap(
      root,
      async () => ["00 Canon/guide.md", "notes.txt"],
      safeBookPath,
    );

    expect(files.get("00 Canon/guide.md")).toBe("# Guide");
    expect(files.has("notes.txt")).toBe(false);
  });
});
