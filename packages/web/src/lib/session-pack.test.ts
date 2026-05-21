import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchSessionPack } from "./session-pack.js";

describe("fetchSessionPack", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns markdown on success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ markdown: "# Pack" }),
      })),
    );
    const md = await fetchSessionPack({
      taskId: "brainstorm",
      provider: "openai",
      model: "gpt-4o-mini",
      bookId: "b",
    });
    expect(md).toBe("# Pack");
  });

  it("returns null on failure", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => {
      throw new Error("offline");
    }));
    const md = await fetchSessionPack({
      taskId: "brainstorm",
      provider: "openai",
      model: "gpt-4o-mini",
      bookId: "b",
    });
    expect(md).toBeNull();
  });
});
