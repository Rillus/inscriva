import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const appCssPath = join(dirname(fileURLToPath(import.meta.url)), "app.css");

describe("drawing-room theme contract", () => {
  it("defines skeuomorphic surface and room tokens in app.css", () => {
    const css = readFileSync(appCssPath, "utf8");
    for (const token of [
      "--surface-paper",
      "--surface-leather",
      "--room-mahogany",
      "--grain-noise-svg",
      "--ornament-gold",
      "--shadow-panel-inset",
    ]) {
      expect(css).toContain(token);
    }
  });
});
