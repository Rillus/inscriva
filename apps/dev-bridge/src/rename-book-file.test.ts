import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { anchorSidecarPath, renameBookFile } from "./rename-book-file.js";

const tmpDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tmpDirs.splice(0).map((d) => fs.rm(d, { recursive: true, force: true })));
});

async function makeBook() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-rename-"));
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

describe("renameBookFile", () => {
  it("renames a markdown file and its anchor sidecar", async () => {
    const root = await makeBook();
    const from = "02 Drafts/Chapters/Ch01.md";
    const to = "02 Drafts/Chapters/Ch02 Opening.md";
    await fs.writeFile(path.join(root, from), "# One", "utf-8");
    await fs.writeFile(
      path.join(root, anchorSidecarPath(from)),
      JSON.stringify({ file: from, version: 1, anchors: [] }),
      "utf-8",
    );

    await renameBookFile(root, from, to, safePath);

    await expect(fs.readFile(path.join(root, to), "utf-8")).resolves.toBe("# One");
    await expect(fs.access(path.join(root, from))).rejects.toThrow();
    const sidecar = JSON.parse(
      await fs.readFile(path.join(root, anchorSidecarPath(to)), "utf-8"),
    );
    expect(sidecar.file).toBe(to);
  });

  it("rejects when the destination already exists", async () => {
    const root = await makeBook();
    const from = "02 Drafts/Chapters/Ch01.md";
    const to = "02 Drafts/Chapters/Ch02.md";
    await fs.writeFile(path.join(root, from), "# One", "utf-8");
    await fs.writeFile(path.join(root, to), "# Two", "utf-8");

    await expect(renameBookFile(root, from, to, safePath)).rejects.toThrow(/already exists/);
  });
});
