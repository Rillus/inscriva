import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PNG } from "pngjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconSvg = join(root, "inscriva-mark-icon.svg");
const iconPng = join(root, "apps/desktop-macos/src-tauri/icons/icon.png");

describe("inscriva-mark-icon.svg", () => {
  it("uses a square viewBox with the mark centred horizontally", () => {
    const svg = readFileSync(iconSvg, "utf8");
    expect(svg).toContain('viewBox="0 0 96 96"');
    expect(svg).toContain('transform="translate(19.5 0)"');
    expect(svg).not.toMatch(/<rect[^>]+fill=/i);
  });
});

describe("rendered app icon PNG", () => {
  it("is square with transparent corners", () => {
    expect(existsSync(iconPng)).toBe(true);
    const { width, height, data } = PNG.sync.read(readFileSync(iconPng));
    expect(width).toBe(height);
    const alphaAt = (x, y) => data[(y * width + x) * 4 + 3];
    expect(alphaAt(0, 0)).toBe(0);
    expect(alphaAt(width - 1, height - 1)).toBe(0);
  });
});
