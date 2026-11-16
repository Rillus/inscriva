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
      pickBookFolder: vi.fn(async () => "/picked"),
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

  it("delegates pickBookFolder to the preload API", async () => {
    const api = mockApi();
    const bridge = createElectronBridge(api);
    await expect(
      bridge.pickBookFolder?.({ prompt: "Open book folder" }),
    ).resolves.toBe("/picked");
    expect(api.book.pickBookFolder).toHaveBeenCalledWith({
      prompt: "Open book folder",
    });
  });

  it("reports electron capabilities with folder picker enabled", async () => {
    const bridge = createElectronBridge(mockApi());
    await expect(bridge.getCapabilities?.()).resolves.toEqual({
      folderPicker: true,
      gitClone: false,
      gitPull: false,
      gitInspect: false,
      gitOAuth: false,
      platform: "electron",
    });
  });

  it("returns empty providers and no-op watch when keys api is absent", async () => {
    const bridge = createElectronBridge(mockApi());
    expect(await bridge.listProviders()).toEqual([]);
    const unsub = bridge.watchBook(() => {});
    expect(typeof unsub).toBe("function");
    unsub();
  });

  it("rejects setApiKey and clearApiKey when keys api is absent", async () => {
    const bridge = createElectronBridge(mockApi());
    await expect(bridge.setApiKey("openai", "sk-x")).rejects.toThrow(
      /Electron shell yet/,
    );
    await expect(bridge.clearApiKey("openai")).rejects.toThrow(
      /Electron shell yet/,
    );
  });

  it("delegates key operations when keys api is present", async () => {
    const providers = [
      { provider: "openai", configured: true },
      { provider: "anthropic", configured: false },
      { provider: "google", configured: false },
      { provider: "custom", configured: false },
    ];
    const api = {
      ...mockApi(),
      keys: {
        setApiKey: vi.fn(async () => {}),
        clearApiKey: vi.fn(async () => {}),
        listProviders: vi.fn(async () => providers),
      },
    };
    const bridge = createElectronBridge(api);
    await bridge.setApiKey("openai", "sk-test");
    expect(api.keys.setApiKey).toHaveBeenCalledWith("openai", "sk-test");
    await bridge.clearApiKey("openai");
    expect(api.keys.clearApiKey).toHaveBeenCalledWith("openai");
    expect(await bridge.listProviders()).toEqual(providers);
    expect(api.keys.listProviders).toHaveBeenCalled();
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
