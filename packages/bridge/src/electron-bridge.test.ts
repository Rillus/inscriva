import { describe, expect, it, vi } from "vitest";
import {
  createElectronBridge,
  type InscrivaElectronApi,
} from "./electron-bridge.js";

function mockApi(): InscrivaElectronApi {
  return {
    platform: "electron",
    book: {
      openBook: vi.fn(async (path: string) => ({
        id: path,
        path,
        title: "T",
      })),
      listFiles: vi.fn(async () => ["a.md"]),
      readFile: vi.fn(async () => "content"),
      writeFile: vi.fn(async () => {}),
      renameFile: vi.fn(async () => {}),
      deleteFile: vi.fn(async () => {}),
      getRecents: vi.fn(async () => ["/recent"]),
      addRecent: vi.fn(async () => {}),
      getBooksLibraryPath: vi.fn(async () => "/library"),
    },
  };
}

describe("createElectronBridge", () => {
  it("delegates book file operations to the preload API", async () => {
    const api = mockApi();
    const bridge = createElectronBridge(api);
    await bridge.openBook("/books/x");
    expect(api.book.openBook).toHaveBeenCalledWith("/books/x");
    expect(await bridge.listFiles()).toEqual(["a.md"]);
    await bridge.writeFile("a.md", "x");
    expect(api.book.writeFile).toHaveBeenCalledWith("a.md", "x");
  });

  it("reports electron capabilities with git and folder picker disabled", async () => {
    const bridge = createElectronBridge(mockApi());
    await expect(bridge.getCapabilities?.()).resolves.toEqual({
      folderPicker: false,
      gitClone: false,
      gitPull: false,
      gitInspect: false,
      gitOAuth: false,
      platform: "electron",
    });
  });

  it("returns empty providers and no-op watch", async () => {
    const bridge = createElectronBridge(mockApi());
    expect(await bridge.listProviders()).toEqual([]);
    const unsub = bridge.watchBook(() => {});
    expect(typeof unsub).toBe("function");
    unsub();
  });

  it("throws for unsupported native operations", async () => {
    const bridge = createElectronBridge(mockApi());
    await expect(bridge.gitPull()).rejects.toThrow(/Electron shell yet/);
    await expect(bridge.createBook({ title: "t", path: "/p" })).rejects.toThrow(
      /Electron shell yet/,
    );
    const stream = bridge.llmStream({
      taskId: "brainstorm",
      provider: "openai",
      model: "gpt",
      bookId: "b",
      userInitiated: true,
    });
    const iter = stream[Symbol.asyncIterator]();
    await expect(iter.next()).rejects.toThrow(/Electron shell yet/);
  });
});
