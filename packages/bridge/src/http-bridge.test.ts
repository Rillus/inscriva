import { afterEach, describe, expect, it, vi } from "vitest";
import { createHttpBridge } from "./http-bridge.js";

describe("createHttpBridge", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls the dev bridge API and caches capabilities", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      const path = String(input).replace("http://127.0.0.1:3847", "");
      if (path === "/capabilities") {
        return new Response(
          JSON.stringify({
            folderPicker: true,
            gitClone: true,
            gitPull: true,
            gitInspect: true,
            gitOAuth: true,
          }),
        );
      }
      if (path === "/book/open") {
        return new Response(JSON.stringify({ id: "1", path: "/book", title: "B" }));
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const bridge = createHttpBridge("http://127.0.0.1:3847/");
    const caps = await bridge.getCapabilities?.();
    const handle = await bridge.openBook("/book");

    expect(caps?.folderPicker).toBe(true);
    expect(handle.title).toBe("B");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await bridge.getCapabilities?.();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back when capabilities cannot be loaded", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("offline", { status: 503 })),
    );
    const bridge = createHttpBridge("http://127.0.0.1:3847");
    const caps = await bridge.getCapabilities?.();
    expect(caps).toEqual({
      folderPicker: false,
      gitClone: false,
      gitPull: true,
      gitInspect: false,
      gitOAuth: false,
    });
  });

  it("rejects unsupported git providers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}))),
    );
    const bridge = createHttpBridge("http://127.0.0.1:3847");
    await expect(bridge.gitOAuthStart("gitlab" as "github")).rejects.toThrow(
      "Unsupported provider",
    );
  });

  it("throws a parsed error when the stream request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: "No API key configured for openai" }), {
          status: 400,
        }),
      ),
    );

    const bridge = createHttpBridge("http://127.0.0.1:3847");
    const stream = bridge.llmStream({
      taskId: "draft-scene",
      provider: "openai",
      model: "gpt-4o-mini",
      bookId: "b",
    });

    await expect(stream.next()).rejects.toThrow("No API key configured for openai");
  });

  it("streams LLM tokens from SSE", async () => {
    const body = [
      'data: {"text":"Hi"}\n\n',
      "data: [DONE]\n\n",
    ].join("");
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo) => {
        if (String(input).endsWith("/llm/stream")) {
          return new Response(
            new ReadableStream({
              start(controller) {
                controller.enqueue(new TextEncoder().encode(body));
                controller.close();
              },
            }),
            { status: 200 },
          );
        }
        return new Response(JSON.stringify({ providers: [] }));
      }),
    );

    const bridge = createHttpBridge("http://127.0.0.1:3847");
    const chunks: string[] = [];
    for await (const text of bridge.llmStream({
      taskId: "brainstorm",
      provider: "openai",
      model: "gpt-4o-mini",
      bookId: "b",
    })) {
      chunks.push(text);
    }
    expect(chunks).toEqual(["Hi"]);
  });

  it("exercises book and git endpoints", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo, init?: RequestInit) => {
      const path = String(input).replace("http://127.0.0.1:3847", "");
      const method = init?.method ?? "GET";
      if (path === "/book/files") {
        return new Response(JSON.stringify({ files: ["a.md"] }));
      }
      if (path.startsWith("/book/file?")) {
        return new Response(JSON.stringify({ content: "body" }));
      }
      if (path === "/book/file" && method === "PUT") {
        return new Response(null, { status: 204 });
      }
      if (path === "/book/file/rename" && method === "POST") {
        return new Response(JSON.stringify({ ok: true }));
      }
      if (path === "/git/status") {
        return new Response(JSON.stringify({ ahead: 0, behind: 0, dirty: false }));
      }
      if (path === "/recents") {
        return new Response(JSON.stringify({ recents: ["/book"] }));
      }
      if (path === "/keys") {
        return new Response(JSON.stringify({ providers: [] }));
      }
      return new Response(JSON.stringify({}));
    });
    vi.stubGlobal("fetch", fetchMock);

    const bridge = createHttpBridge("http://127.0.0.1:3847");
    expect(await bridge.listFiles()).toEqual(["a.md"]);
    expect(await bridge.readFile("a.md")).toBe("body");
    await bridge.writeFile("a.md", "next");
    await bridge.renameFile("a.md", "b.md");
    expect(await bridge.gitStatus()).toEqual({ ahead: 0, behind: 0, dirty: false });
    expect(await bridge.getRecents()).toEqual(["/book"]);
    expect(await bridge.listProviders()).toEqual([]);
  });
});
