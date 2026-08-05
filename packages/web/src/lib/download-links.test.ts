import { describe, expect, it } from "vitest";
import {
  downloadLinks,
  macosDownloadHref,
  requiresLocalApp,
} from "./download-links.js";
import type { WritingMode } from "./writing-mode.js";

describe("download-links", () => {
  it("falls back to GitHub releases when macOS URL is unset", () => {
    expect(macosDownloadHref()).toContain("github.com");
    expect(macosDownloadHref()).toContain("releases");
  });

  it("uses explicit macOS download URL when configured", () => {
    expect(
      macosDownloadHref({
        ...downloadLinks(),
        macosDownloadUrl: "https://cdn.example/inscriva.dmg",
      }),
    ).toBe("https://cdn.example/inscriva.dmg");
  });

  it("flags static web as requiring local app", () => {
    const modes: WritingMode[] = ["native", "dev-bridge", "static-web"];
    expect(modes.map(requiresLocalApp)).toEqual([false, false, true]);
  });
});
