import { describe, expect, it, vi, afterEach } from "vitest";
import { streamAnthropicChat } from "./providers/anthropic.js";
import { streamGoogleChat } from "./providers/google.js";
import { streamOpenAiChat } from "./providers/openai.js";
import { streamProviderChat } from "./providers/index.js";

describe("streamOpenAiChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("yields text deltas from an SSE response", async () => {
    const body = [
      'data: {"choices":[{"delta":{"content":"Hel"}}]}',
      "",
      'data: {"choices":[{"delta":{"content":"lo"}}]}',
      "",
      "data: [DONE]",
      "",
    ].join("\n");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(body));
            controller.close();
          },
        }),
      })),
    );

    const chunks: string[] = [];
    for await (const text of streamOpenAiChat(
      [{ role: "user", content: "Hi" }],
      { apiKey: "sk-test", model: "gpt-4o-mini" },
    )) {
      chunks.push(text);
    }

    expect(chunks.join("")).toBe("Hello");
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/chat/completions",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("throws when the API returns an error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 401,
        text: async () => "unauthorised",
      })),
    );
    await expect(async () => {
      for await (const _ of streamOpenAiChat(
        [{ role: "user", content: "Hi" }],
        { apiKey: "bad", model: "gpt-4o-mini" },
      )) {
        /* drain */
      }
    }).rejects.toThrow("unauthorised");
  });
});

describe("streamAnthropicChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("yields content_block_delta text", async () => {
    const body = [
      'data: {"type":"content_block_delta","delta":{"type":"text_delta","text":"Hi"}}',
      "",
      "data: [DONE]",
      "",
    ].join("\n");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(body));
            controller.close();
          },
        }),
      })),
    );

    const chunks: string[] = [];
    for await (const text of streamAnthropicChat(
      [
        { role: "system", content: "You are helpful." },
        { role: "user", content: "Hello" },
      ],
      { apiKey: "key", model: "claude-sonnet" },
    )) {
      chunks.push(text);
    }
    expect(chunks.join("")).toBe("Hi");
  });
});

describe("streamGoogleChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses SSE chunks and requests alt=sse", async () => {
    const payload =
      'data: {"candidates":[{"content":{"parts":[{"text":"Gemini"}]}}]}\n\n';
    const fetchMock = vi.fn(async () => ({
      ok: true,
      body: new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(payload));
          controller.close();
        },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const chunks: string[] = [];
    for await (const text of streamGoogleChat(
      [
        { role: "system", content: "Guide" },
        { role: "user", content: "Hi" },
      ],
      { apiKey: "key", model: "gemini-3.1-flash-lite" },
    )) {
      chunks.push(text);
    }
    expect(chunks.join("")).toBe("Gemini");
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain("alt=sse");
  });

  it("skips thought parts and yields the visible response (Gemini 3+)", async () => {
    const payload =
      'data: {"candidates":[{"content":{"parts":[{"thought":true,"text":"planning…"},{"text":"The end."}]}}]}\n\n';
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(payload));
            controller.close();
          },
        }),
      })),
    );

    const chunks: string[] = [];
    for await (const text of streamGoogleChat(
      [{ role: "user", content: "Continue" }],
      { apiKey: "key", model: "gemini-3.1-flash-lite" },
    )) {
      chunks.push(text);
    }
    expect(chunks.join("")).toBe("The end.");
  });
});

describe("streamProviderChat", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("routes custom provider to OpenAI", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(
              new TextEncoder().encode(
                'data: {"choices":[{"delta":{"content":"x"}}]}\n\ndata: [DONE]\n\n',
              ),
            );
            controller.close();
          },
        }),
      })),
    );
    const chunks: string[] = [];
    for await (const text of streamProviderChat(
      "custom",
      [{ role: "user", content: "Hi" }],
      { apiKey: "k", model: "local" },
    )) {
      chunks.push(text);
    }
    expect(chunks.join("")).toBe("x");
  });
});
