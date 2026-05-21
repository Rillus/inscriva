import { describe, expect, it } from "vitest";
import { createMockBridge, type MockBook } from "./mock-bridge.js";

function sampleBook(): MockBook {
  return {
    path: "/books/demo",
    title: "Demo",
    files: new Map([["chapter.md", "# Hello"]]),
  };
}

describe("createMockBridge", () => {
  it("lists, reads, and writes files", async () => {
    const book = sampleBook();
    const bridge = createMockBridge(book);

    expect(await bridge.listFiles()).toEqual(["chapter.md"]);
    expect(await bridge.readFile("chapter.md")).toBe("# Hello");

    await bridge.writeFile("chapter.md", "# Updated");
    expect(await bridge.readFile("chapter.md")).toBe("# Updated");
  });

  it("notifies watchers on write", async () => {
    const book = sampleBook();
    const bridge = createMockBridge(book);
    const events: unknown[] = [];
    const stop = bridge.watchBook((e) => events.push(e));

    await bridge.writeFile("chapter.md", "x");
    stop();

    expect(events).toEqual([{ path: "chapter.md", kind: "modified" }]);
  });

  it("opens only the configured book path", async () => {
    const bridge = createMockBridge(sampleBook());
    const handle = await bridge.openBook("/books/demo");
    expect(handle.title).toBe("Demo");
    await expect(bridge.openBook("/other")).rejects.toThrow("Unknown book");
  });

  it("renames a file and moves its sidecar metadata", async () => {
    const book = sampleBook();
    book.files.set(
      ".inscriva/anchors/chapter.md.json",
      JSON.stringify({ file: "chapter.md", version: 1, anchors: [] }),
    );
    const bridge = createMockBridge(book);

    await bridge.renameFile("chapter.md", "renamed.md");

    expect(await bridge.listFiles()).toContain("renamed.md");
    expect(book.files.has("chapter.md")).toBe(false);
    const sidecar = JSON.parse(
      book.files.get(".inscriva/anchors/renamed.md.json")!,
    );
    expect(sidecar.file).toBe("renamed.md");
  });

  it("throws when reading a missing file", async () => {
    const bridge = createMockBridge(sampleBook());
    await expect(bridge.readFile("missing.md")).rejects.toThrow("File not found");
  });

  it("streams a mock LLM response", async () => {
    const bridge = createMockBridge(sampleBook());
    const chunks: string[] = [];
    for await (const part of bridge.llmStream({
      taskId: "brainstorm",
      provider: "openai",
      model: "gpt-4o-mini",
      bookId: "book-1",
    })) {
      chunks.push(part);
    }
    expect(chunks.join("")).toContain("[mock brainstorm]");
  });

  it("reports git and provider stubs", async () => {
    const bridge = createMockBridge(sampleBook());
    expect(await bridge.gitInspect("/books/demo")).toEqual({
      path: "/books/demo",
      isRepo: false,
      remotes: [],
    });
    expect(await bridge.gitOAuthStatus("github")).toEqual({
      connected: false,
      configured: false,
    });
    expect(await bridge.listProviders()).toHaveLength(3);
    await expect(bridge.gitClone({ url: "x", parentPath: "y" })).rejects.toThrow(
      "native bridge",
    );
  });
});
