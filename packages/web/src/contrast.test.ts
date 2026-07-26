import { describe, expect, it } from "vitest";
import {
  blendOver,
  contrastRatio,
  parseHex,
  relativeLuminance,
} from "./contrast.js";

describe("contrast helpers", () => {
  it("parses hex colours", () => {
    expect(parseHex("#1a1510")).toEqual([26, 21, 16]);
  });

  it("computes known contrast ratios", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(contrastRatio("#1a1510", "#faf6ee")).toBeGreaterThan(10);
  });

  it("blends foreground over background", () => {
    expect(blendOver("#f4ebe3", "#2c1f18", 0.6)).toBe("#a49992");
  });

  it("flags body ink on leather as failing AA (regression guard)", () => {
    expect(contrastRatio("#1a1510", "#2c1f18")).toBeLessThan(2);
    expect(relativeLuminance("#f4ebe3")).toBeGreaterThan(
      relativeLuminance("#1a1510"),
    );
  });
});
