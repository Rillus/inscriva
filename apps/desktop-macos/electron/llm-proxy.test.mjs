import { describe, expect, it, vi } from "vitest";
import {
  createLlmStreamRunner,
  LLM_IPC,
  registerLlmIpc,
} from "./llm-proxy.mjs";

const baseRequest = {
  taskId: "brainstorm",
  provider: "openai",
  model: "gpt-4o-mini",
  bookId: "/books/demo",
  userInitiated: true,
};

/**
 * @param {Partial<Parameters<typeof createLlmStreamRunner>[0]>} overrides
 */
function runner(overrides = {}) {
  const sent = [];
  const send = (channel, payload) => sent.push({ channel, payload });

  const bookFs = {
    getBookRoot: () => "/books/demo",
    isBookApproved: () => true,
    listFiles: () => ["notes.md"],
    readFile: () => "# Notes",
    ...overrides.bookFs,
  };

  const deps = {
    getKey: () => "sk-test",
    bookFs,
    runLlmStream: async function* () {
      yield "hello ";
      yield "world";
    },
    ...overrides,
  };

  const { runStream } = createLlmStreamRunner(deps);
  return { runStream, send, sent, deps, bookFs };
}

describe("llm-proxy runStream", () => {
  it("streams chunks and sends done on success", async () => {
    const { runStream, send, sent } = runner();
    await runStream({ send, requestId: "r1", request: baseRequest });

    const chunks = sent
      .filter((m) => m.channel === LLM_IPC.CHUNK)
      .map((m) => m.payload.text);
    expect(chunks).toEqual(["hello ", "world"]);
    expect(sent.some((m) => m.channel === LLM_IPC.DONE)).toBe(true);
    expect(sent.some((m) => m.channel === LLM_IPC.ERROR)).toBe(false);
  });

  it("rejects when no API key is configured", async () => {
    const { runStream, send, sent } = runner({
      getKey: () => null,
    });

    await expect(
      runStream({ send, requestId: "r2", request: baseRequest }),
    ).rejects.toThrow(/No API key configured/);
    expect(sent).toHaveLength(0);
  });

  it("rejects when userInitiated is not true", async () => {
    const { runStream, send } = runner();
    await expect(
      runStream({
        send,
        requestId: "r3",
        request: { ...baseRequest, userInitiated: false },
      }),
    ).rejects.toThrow(/userInitiated/);
  });

  it("rejects when bookId does not match the open book", async () => {
    const { runStream, send } = runner({
      bookFs: {
        getBookRoot: () => "/books/other",
        isBookApproved: () => true,
        listFiles: () => [],
        readFile: () => "",
      },
    });

    await expect(
      runStream({ send, requestId: "r4b", request: baseRequest }),
    ).rejects.toThrow(/does not match the open book/);
  });

  it("rejects unapproved book paths", async () => {
    const { runStream, send } = runner({
      bookFs: {
        getBookRoot: () => "/books/demo",
        isBookApproved: () => false,
        listFiles: () => [],
        readFile: () => "",
      },
    });

    await expect(
      runStream({ send, requestId: "r4", request: baseRequest }),
    ).rejects.toThrow(/not approved/);
  });

  it("sends error and done when the provider stream fails", async () => {
    const { runStream, send, sent } = runner({
      runLlmStream: async function* () {
        throw new Error("Provider rate limited");
      },
    });

    await runStream({ send, requestId: "r5", request: baseRequest });

    expect(sent.find((m) => m.channel === LLM_IPC.ERROR)?.payload.error).toBe(
      "Provider rate limited",
    );
    expect(sent.some((m) => m.channel === LLM_IPC.DONE)).toBe(true);
  });

  it("passes resolved book files and key into runLlmStream", async () => {
    const runLlmStream = vi.fn(async function* () {
      yield "x";
    });
    const loadBookFiles = vi.fn(() => new Map([["a.md", "body"]]));

    const { runStream, send } = runner({ runLlmStream, loadBookFiles });
    await runStream({ send, requestId: "r6", request: baseRequest });

    expect(loadBookFiles).toHaveBeenCalled();
    expect(runLlmStream).toHaveBeenCalledWith(
      baseRequest,
      new Map([["a.md", "body"]]),
      "sk-test",
    );
  });

  it("stops emitting chunks after abort", async () => {
    const controller = new AbortController();
    const { runStream, send, sent } = runner({
      runLlmStream: async function* () {
        yield "a";
        controller.abort();
        yield "b";
      },
    });

    await runStream({
      send,
      requestId: "r7",
      request: baseRequest,
      signal: controller.signal,
    });

    const chunks = sent
      .filter((m) => m.channel === LLM_IPC.CHUNK)
      .map((m) => m.payload.text);
    expect(chunks).toEqual(["a"]);
    expect(sent.some((m) => m.channel === LLM_IPC.DONE)).toBe(false);
  });
});

describe("registerLlmIpc", () => {
  /**
   * @returns {Map<string, Function>}
   */
  function mockIpcMain() {
    /** @type {Map<string, Function>} */
    const handlers = new Map();
    return {
      ipcMain: {
        handle: (channel, listener) => {
          handlers.set(channel, listener);
        },
      },
      handlers,
    };
  }

  it("handles start via IPC and emits chunk and done events", async () => {
    const { ipcMain, handlers } = mockIpcMain();
    const sender = { send: vi.fn() };

    registerLlmIpc({
      ipcMain,
      getKey: () => "sk-test",
      bookFs: {
        getBookRoot: () => "/books/demo",
        isBookApproved: () => true,
        listFiles: () => [],
        readFile: () => "",
      },
      runLlmStream: async function* () {
        yield "ipc-chunk";
      },
    });

    await handlers.get(LLM_IPC.START)({ sender }, {
      requestId: "ipc-1",
      request: baseRequest,
    });

    expect(sender.send).toHaveBeenCalledWith(LLM_IPC.CHUNK, {
      requestId: "ipc-1",
      text: "ipc-chunk",
    });
    expect(sender.send).toHaveBeenCalledWith(LLM_IPC.DONE, {
      requestId: "ipc-1",
    });
  });

  it("emits error and done when validation fails during IPC start", async () => {
    const { ipcMain, handlers } = mockIpcMain();
    const sender = { send: vi.fn() };

    registerLlmIpc({
      ipcMain,
      getKey: () => null,
      bookFs: {
        getBookRoot: () => "/books/demo",
        isBookApproved: () => true,
        listFiles: () => [],
        readFile: () => "",
      },
      runLlmStream: async function* () {
        yield "never";
      },
    });

    await handlers.get(LLM_IPC.START)({ sender }, {
      requestId: "ipc-2",
      request: baseRequest,
    });

    expect(sender.send).toHaveBeenCalledWith(LLM_IPC.ERROR, {
      requestId: "ipc-2",
      error: "No API key configured for openai",
    });
    expect(sender.send).toHaveBeenCalledWith(LLM_IPC.DONE, {
      requestId: "ipc-2",
    });
  });

  it("aborts an in-flight stream on cancel", async () => {
    const { ipcMain, handlers } = mockIpcMain();
    const sender = { send: vi.fn() };

    registerLlmIpc({
      ipcMain,
      getKey: () => "sk-test",
      bookFs: {
        getBookRoot: () => "/books/demo",
        isBookApproved: () => true,
        listFiles: () => ["a.md"],
        readFile: () => "text",
      },
      runLlmStream: async function* () {
        yield "one";
        await new Promise((r) => setTimeout(r, 30));
        yield "two";
      },
    });

    const startPromise = handlers.get(LLM_IPC.START)({ sender }, {
      requestId: "ipc-3",
      request: baseRequest,
    });
    await new Promise((r) => setTimeout(r, 0));
    await handlers.get(LLM_IPC.CANCEL)({}, "ipc-3");
    await startPromise;

    const chunks = sender.send.mock.calls
      .filter(([channel]) => channel === LLM_IPC.CHUNK)
      .map(([, payload]) => payload.text);
    expect(chunks).toEqual(["one"]);
  });
});