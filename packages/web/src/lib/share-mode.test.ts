import { describe, expect, it } from "vitest";
import { isShareMode, shareModeSearch } from "./share-mode.js";

describe("share-mode", () => {
  it("detects share and readOnly query params", () => {
    expect(isShareMode("?share=1")).toBe(true);
    expect(isShareMode("?readOnly=1")).toBe(true);
    expect(isShareMode("?demo=1")).toBe(false);
  });

  it("builds share search string", () => {
    expect(shareModeSearch()).toBe("?share=1");
  });
});
