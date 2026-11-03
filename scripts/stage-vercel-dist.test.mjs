import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("stage-vercel-dist", () => {
  it("copies web build output to repo-root dist", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-stage-"));
    const source = path.join(tmp, "packages/web/dist");
    const destination = path.join(tmp, "dist");
    await fs.mkdir(source, { recursive: true });
    await fs.writeFile(path.join(source, "index.html"), "<!doctype html>");

    await fs.access(source);
    await fs.rm(destination, { recursive: true, force: true });
    await fs.cp(source, destination, { recursive: true });

    await expect(fs.access(path.join(destination, "index.html"))).resolves.toBeUndefined();
  });
});
