import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchLlmPreview } from "./llm-preview.js";

describe("fetchLlmPreview", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns assembled context on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          context: { system: "sys", user: "user", sources: [] },
        }),
      })),
    );
    const ctx = await fetchLlmPreview({
      taskId: "brainstorm",
      provider: "openai",
      model: "gpt-4o-mini",
      bookId: "b",
    });
    expect(ctx?.user).toBe("user");
  });

  it("returns null when the bridge is offline", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false })));
    const ctx = await fetchLlmPreview({
      taskId: "brainstorm",
      provider: "openai",
      model: "gpt-4o-mini",
      bookId: "b",
    });
    expect(ctx).toBeNull();
  });
});
