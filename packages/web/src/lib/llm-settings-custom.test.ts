import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_CUSTOM_BASE_URL,
  loadCustomBaseUrl,
  providerBaseUrlFor,
  saveCustomBaseUrl,
} from "./llm-settings.js";

describe("custom base URL settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to local Ollama path", () => {
    expect(loadCustomBaseUrl()).toBe(DEFAULT_CUSTOM_BASE_URL);
  });

  it("returns base URL only for custom provider", () => {
    saveCustomBaseUrl("http://localhost:8080/v1");
    expect(providerBaseUrlFor("custom")).toBe("http://localhost:8080/v1");
    expect(providerBaseUrlFor("openai")).toBeUndefined();
  });
});
