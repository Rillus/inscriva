import { afterEach, describe, expect, it } from "vitest";
import type { ProviderStatus } from "@inscriva/bridge";
import {
  loadModelOverrides,
  loadPreferredProvider,
  modelForProvider,
  pickLlmProvider,
  saveModelOverride,
  savePreferredProvider,
} from "./llm-settings.js";

describe("llm-settings", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("loads and saves model overrides", () => {
    expect(loadModelOverrides()).toEqual({});
    saveModelOverride("openai", "gpt-4.1");
    expect(loadModelOverrides()).toEqual({ openai: "gpt-4.1" });
    expect(modelForProvider("openai")).toBe("gpt-4.1");
  });

  it("falls back to package defaults when unset", () => {
    expect(modelForProvider("anthropic")).toContain("claude");
  });

  it("returns empty overrides for invalid JSON", () => {
    localStorage.setItem("inscriva.llm.models", "{not json");
    expect(loadModelOverrides()).toEqual({});
  });

  it("prefers the saved provider when it is configured", () => {
    savePreferredProvider("google");
    const statuses: ProviderStatus[] = [
      { provider: "openai", configured: true },
      { provider: "google", configured: true },
    ];
    expect(pickLlmProvider(statuses)).toBe("google");
  });

  it("falls back to the first configured provider", () => {
    const statuses: ProviderStatus[] = [
      { provider: "openai", configured: false },
      { provider: "google", configured: true },
    ];
    expect(pickLlmProvider(statuses)).toBe("google");
    expect(loadPreferredProvider()).toBeNull();
  });
});
