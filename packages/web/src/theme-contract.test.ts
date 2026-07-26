import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { contrastRatio, WCAG_AA_NORMAL } from "./contrast.js";
import {
  THEME_CONTRAST_PAIRS,
  THEME_TOKEN_VALUES,
} from "./theme-tokens.js";

const appCssPath = join(dirname(fileURLToPath(import.meta.url)), "app.css");

function tokenFromCss(css: string, name: string): string | undefined {
  const match = css.match(new RegExp(`${name}:\\s*(#[0-9a-fA-F]{6})`));
  return match?.[1];
}

describe("drawing-room theme contract", () => {
  const css = readFileSync(appCssPath, "utf8");

  it("defines skeuomorphic surface and room tokens in app.css", () => {
    for (const token of [
      "--surface-paper",
      "--surface-leather",
      "--room-mahogany",
      "--grain-noise-svg",
      "--ornament-gold",
      "--shadow-panel-inset",
      "--text-on-leather-subtle",
      "--text-on-topbar-muted",
      "--text-on-leather-chip",
      "--surface-tab-active",
      "--ink-on-paper",
      "--border-on-paper",
    ]) {
      expect(css).toContain(token);
    }
  });

  it("keeps app.css token values aligned with theme-tokens.ts", () => {
    for (const [name, expected] of Object.entries(THEME_TOKEN_VALUES)) {
      expect(tokenFromCss(css, name), name).toBe(expected);
    }
  });

  it("aliases --text to paper ink (sidebar overrides --text only)", () => {
    expect(css).toMatch(/--text:\s*var\(--ink-on-paper\)/);
    expect(css).toMatch(/--text-muted:\s*var\(--ink-on-paper-muted\)/);
  });

  it("forces paper ink on inputs inside .surface-paper-ink", () => {
    expect(css).toContain(".surface-paper-ink :is(input, textarea, select)");
    expect(css).toMatch(
      /\.surface-paper-ink :is\(input, textarea\)::placeholder[\s\S]*--ink-on-paper-muted/,
    );
  });

  it("meets WCAG AA contrast (4.5:1) for paired foreground/background tokens", () => {
    for (const pair of THEME_CONTRAST_PAIRS) {
      const ratio = contrastRatio(pair.foreground, pair.background);
      const minimum = "minimum" in pair ? pair.minimum : WCAG_AA_NORMAL;
      expect(
        ratio,
        `${pair.name}: ${pair.foreground} on ${pair.background} = ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(minimum);
    }
  });
});
