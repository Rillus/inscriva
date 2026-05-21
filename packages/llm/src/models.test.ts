import { describe, expect, it } from "vitest";
import { DEFAULT_MODELS, defaultModelForProvider } from "./models.js";

describe("defaultModelForProvider", () => {
  it("returns the default model for each provider", () => {
    expect(defaultModelForProvider("openai")).toBe(DEFAULT_MODELS.openai.default);
    expect(defaultModelForProvider("anthropic")).toBe(
      DEFAULT_MODELS.anthropic.default,
    );
    expect(defaultModelForProvider("google")).toBe(DEFAULT_MODELS.google.default);
  });
});
