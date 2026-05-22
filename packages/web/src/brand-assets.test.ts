import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const indexHtmlPath = join(dirname(fileURLToPath(import.meta.url)), "..", "index.html");

describe("brand assets", () => {
  it("serves the square centred mark SVG as favicon", () => {
    const favicon = readFileSync(join(publicDir, "favicon.svg"), "utf8");
    const icon = readFileSync(join(publicDir, "inscriva-mark-icon.svg"), "utf8");
    expect(favicon).toBe(icon);
    expect(favicon).toContain('viewBox="0 0 96 96"');
    expect(favicon).toContain('transform="translate(19.5 0)"');
  });

  it("keeps the tall mark SVG for non-icon uses", () => {
    const mark = readFileSync(join(publicDir, "inscriva-mark.svg"), "utf8");
    expect(mark).toContain('viewBox="0 0 57 96"');
  });

  it("serves the full wordmark SVG for the header", () => {
    const wordmark = readFileSync(join(publicDir, "inscriva.svg"), "utf8");
    expect(wordmark).toContain('viewBox="0 0 258 96"');
    expect(wordmark).toContain("Cinzel");
  });

  it("links the favicon in index.html", () => {
    const html = readFileSync(indexHtmlPath, "utf8");
    expect(html).toContain('href="/favicon.svg"');
  });
});
