import { afterEach, describe, expect, it, vi } from "vitest";
import {
  formatSseChunk,
  previewContext,
  sessionPackMarkdown,
  streamLlmResponse,
} from "./llm-route.js";

describe("formatSseChunk", () => {
  it("serialises JSON payloads as SSE data lines", () => {
    expect(formatSseChunk({ text: "hi" })).toBe('data: {"text":"hi"}\n\n');
  });
});

describe("previewContext", () => {
  it("delegates to the llm context builder", () => {
    const files = new Map([
      ["00 Canon/Style Guide.md", "# Style Guide\n\nClose third."],
    ]);
    const ctx = previewContext(
      {
        taskId: "brainstorm",
        provider: "openai",
        model: "gpt-4o-mini",
        bookId: "book-1",
      },
      files,
    );
    expect(ctx.user).toContain("Style Guide");
  });
});

describe("sessionPackMarkdown", () => {
  it("returns markdown suitable for external tools", () => {
    const files = new Map([
      ["00 Canon/Style Guide.md", "# Style Guide\n\nClose third."],
    ]);
    const md = sessionPackMarkdown(
      {
        taskId: "brainstorm",
        provider: "openai",
        model: "gpt-4o-mini",
        bookId: "book-1",
      },
      files,
      "Test Book",
    );
    expect(md).toContain("# Inscriva Session Pack");
    expect(md).toContain("brainstorm");
    expect(md).toContain("Test Book");
    expect(md).toContain("Close third");
    expect(md).not.toContain("gpt-4o-mini");
    expect(md).not.toContain("openai");
  });
});

describe("streamLlmResponse", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("wraps provider chunks as SSE and terminates with DONE", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"Hi"}}]}\n\ndata: [DONE]\n\n',
              ),
            );
            controller.close();
          },
        }),
      })),
    );

    const files = new Map([["00 Canon/Style Guide.md", "# Voice"]]);
    const chunks: string[] = [];
    for await (const part of streamLlmResponse(
      {
        taskId: "brainstorm",
        provider: "openai",
        model: "gpt-4o-mini",
        bookId: "book-1",
      },
      files,
      "sk-test",
    )) {
      chunks.push(part);
    }
    expect(chunks[0]).toContain('"text":"Hi"');
    expect(chunks.at(-1)).toBe("data: [DONE]\n\n");
  });
});
