import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { anchorSidecarPath } from "./rename-book-file.js";
import { deleteBookFile } from "./delete-book-file.js";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

async function makeBook() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-delete-"));
  tmpDirs.push(root);
  await fs.mkdir(path.join(root, "02 Drafts", "Chapters"), { recursive: true });
  await fs.mkdir(path.join(root, ".inscriva", "anchors"), { recursive: true });
  return root;
}

function safePath(root: string, rel: string) {
  const full = path.join(root, rel);
  if (!full.startsWith(root)) throw new Error("Path escapes book root");
  return full;
}

describe("deleteBookFile", () => {
  it("deletes a markdown file and its anchor sidecar", async () => {
    const root = await makeBook();
    const filePath = "02 Drafts/Chapters/Ch01.md";
    await fs.writeFile(path.join(root, filePath), "# One", "utf-8");
    await fs.writeFile(
      path.join(root, anchorSidecarPath(filePath)),
      JSON.stringify({ file: filePath, version: 1, anchors: [] }),
      "utf-8",
    );

    await deleteBookFile(root, filePath, safePath);

    await expect(fs.access(path.join(root, filePath))).rejects.toThrow();
    await expect(
      fs.access(path.join(root, anchorSidecarPath(filePath))),
    ).rejects.toThrow();
  });

  it("throws when the file does not exist", async () => {
    const root = await makeBook();
    await expect(
      deleteBookFile(root, "02 Drafts/Chapters/missing.md", safePath),
    ).rejects.toThrow(/not found/i);
  });
});
