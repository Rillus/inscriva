import { describe, expect, it, vi, afterEach } from "vitest";
import { previewContext, runLlmStream } from "./stream.js";

describe("previewContext", () => {
  it("assembles context from book files", () => {
    const files = new Map([["00 Canon/Style Guide.md", "# Voice\n\nWarm."]]);
    const ctx = previewContext(
      {
        taskId: "brainstorm",
        provider: "openai",
        model: "gpt-4o-mini",
        bookId: "b",
      },
      files,
    );
    expect(ctx.user).toContain("Warm");
  });
});

describe("runLlmStream", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delegates to the provider stream", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"OK"}}]}\n\ndata: [DONE]\n\n',
              ),
            );
            controller.close();
          },
        }),
      })),
    );

    const files = new Map([["00 Canon/Style Guide.md", "# Voice"]]);
    const chunks: string[] = [];
    for await (const text of runLlmStream(
      {
        taskId: "brainstorm",
        provider: "openai",
        model: "gpt-4o-mini",
        bookId: "b",
      },
      files,
      "sk-test",
    )) {
      chunks.push(text);
    }
    expect(chunks.join("")).toBe("OK");
  });
});
