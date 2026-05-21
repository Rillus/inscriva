import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMockBridge } from "./mock-bridge.js";
import { detectHost, getBridge, installBridge } from "./host.js";

describe("host detection", () => {
  beforeEach(() => {
    vi.stubGlobal("window", {} as Window & typeof globalThis);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns browser when no bridge is present", () => {
    expect(detectHost()).toBe("browser");
    expect(getBridge()).toBeNull();
  });

  it("detects an installed bridge", () => {
    const book = { path: "/x", title: "X", files: new Map<string, string>() };
    installBridge(createMockBridge(book));
    expect(detectHost()).toBe("bridge");
    expect(getBridge()).not.toBeNull();
  });
});
