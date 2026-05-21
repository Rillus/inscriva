import { describe, expect, it, afterEach, vi } from "vitest";
import type { InscrivaBridge } from "@inscriva/bridge";
import {
  loadStoredApiKeys,
  saveStoredApiKey,
  syncStoredKeysToBridge,
  wrapBridgeWithStoredKeys,
} from "./stored-api-keys.js";

describe("stored-api-keys", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("persists keys in localStorage", () => {
    saveStoredApiKey("google", "gemini-key");
    expect(loadStoredApiKeys()).toEqual({ google: "gemini-key" });
  });

  it("syncs stored keys to the bridge on startup", async () => {
    saveStoredApiKey("google", "gemini-key");
    const setApiKey = vi.fn(async () => {});
    const bridge: Pick<InscrivaBridge, "setApiKey"> = { setApiKey };
    await syncStoredKeysToBridge(bridge as InscrivaBridge);
    expect(setApiKey).toHaveBeenCalledWith("google", "gemini-key");
  });

  it("reports configured when only local storage has a key", async () => {
    saveStoredApiKey("google", "gemini-key");
    const inner: Pick<InscrivaBridge, "listProviders" | "setApiKey" | "clearApiKey"> = {
      async listProviders() {
        return [
          { provider: "openai", configured: false },
          { provider: "anthropic", configured: false },
          { provider: "google", configured: false },
        ];
      },
      async setApiKey() {},
      async clearApiKey() {},
    };
    const wrapped = wrapBridgeWithStoredKeys(inner as InscrivaBridge);
    const statuses = await wrapped.listProviders();
    expect(statuses.find((p) => p.provider === "google")?.configured).toBe(true);
  });
});
