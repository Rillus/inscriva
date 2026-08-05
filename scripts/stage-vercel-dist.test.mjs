import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

describe("stage-vercel-dist", () => {
  it("expects web build output under packages/web/dist", async () => {
    const webDist = path.join(root, "packages/web/dist");
    try {
      await fs.access(webDist);
    } catch {
      expect.fail(
        "packages/web/dist missing — run pnpm --filter @inscriva/web build before stage-vercel-dist",
      );
    }

    const indexHtml = path.join(webDist, "index.html");
    await expect(fs.access(indexHtml)).resolves.toBeUndefined();
  });
});
