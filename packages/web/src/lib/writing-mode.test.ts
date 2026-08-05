import { describe, expect, it, vi, afterEach } from "vitest";
import { detectWritingMode, requiresLocalApp } from "./writing-mode.js";

describe("writing-mode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("detects static web when not Tauri and bridge health fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(detectWritingMode("http://127.0.0.1:3847")).resolves.toBe(
      "static-web",
    );
  });

  it("detects dev-bridge when health succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true } as Response),
    );
    await expect(detectWritingMode("http://127.0.0.1:3847")).resolves.toBe(
      "dev-bridge",
    );
  });

  it("requires local app only on static web", () => {
    expect(requiresLocalApp("static-web")).toBe(true);
    expect(requiresLocalApp("native")).toBe(false);
  });
});
