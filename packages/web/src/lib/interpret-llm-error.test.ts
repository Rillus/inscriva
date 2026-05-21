import { describe, expect, it } from "vitest";
import { interpretLlmError, tryInterpretStreamedLlmError } from "./interpret-llm-error.js";

const GOOGLE_429 = `[{
  "error": {
    "code": 429,
    "message": "You exceeded your current quota, please check your plan and billing details.\\n* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-2.0-flash\\nPlease retry in 46.128002129s.",
    "status": "RESOURCE_EXHAUSTED"
  }
}]`;

describe("interpretLlmError", () => {
  it("explains Google Gemini quota errors in plain language", () => {
    const err = interpretLlmError(GOOGLE_429);
    expect(err.title).toBe("Google Gemini quota exceeded");
    expect(err.summary).toContain("gemini-2.0-flash");
    expect(err.hint).toMatch(/47 seconds/i);
    expect(err.retryAfterSeconds).toBe(47);
    expect(err.detail).toBe(GOOGLE_429);
  });

  it("explains missing API keys", () => {
    const err = interpretLlmError("No API key configured for openai");
    expect(err.title).toBe("API key missing");
    expect(err.hint).toContain("Settings");
  });

  it("detects streamed error JSON", () => {
    const err = tryInterpretStreamedLlmError(GOOGLE_429);
    expect(err?.title).toBe("Google Gemini quota exceeded");
  });

  it("returns null for normal prose", () => {
    expect(tryInterpretStreamedLlmError("She walked home.")).toBeNull();
  });
});
