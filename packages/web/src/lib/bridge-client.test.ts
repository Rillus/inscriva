import { afterEach, describe, expect, it, vi } from "vitest";
import { createMockBridge } from "@inscriva/bridge";
import { createMockBook } from "./mock-book.js";
import {
  fixtureBookPath,
  loadCapabilities,
  resolveBridge,
} from "./bridge-client.js";

describe("bridge-client", () => {
  afterEach(() => {
    if (typeof window !== "undefined") {
      delete window.inscrivaBridge;
    }
    vi.unstubAllGlobals();
  });

  it("uses an already-installed bridge", async () => {
    const mock = createMockBridge(createMockBook());
    window.inscrivaBridge = mock;
    const { bridge, host } = await resolveBridge();
    expect(host).toBe("bridge");
    expect(await bridge.listFiles()).toEqual(await mock.listFiles());
  });

  it("falls back to mock book when dev bridge is offline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNREFUSED");
      }),
    );
    const { bridge, host } = await resolveBridge();
    expect(host).toBe("bridge");
    expect(await bridge.listFiles()).toContain("02 Drafts/Chapters/Ch01 - The Eighth A.md");
  });

  it("uses demo host flag when requested", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    const { host } = await resolveBridge({ demo: true });
    expect(host).toBe("browser");
  });

  it("loads capabilities from bridge or infers them", async () => {
    const mock = createMockBridge(createMockBook());
    const caps = await loadCapabilities(mock);
    expect(caps.gitPull).toBe(true);
  });

  it("exposes fixture book path from env", () => {
    expect(typeof fixtureBookPath()).toBe("string");
  });
});
