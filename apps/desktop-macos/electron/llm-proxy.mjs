import path from "node:path";
import { loadBookFilesMap } from "./book-files-map.mjs";

export const LLM_IPC = {
  START: "inscriva:llm:start",
  CANCEL: "inscriva:llm:cancel",
  CHUNK: "inscriva:llm:chunk",
  ERROR: "inscriva:llm:error",
  DONE: "inscriva:llm:done",
};

/**
 * @param {import("@inscriva/bridge").LlmRequest} request
 */
export function assertUserInitiated(request) {
  if (request.userInitiated !== true) {
    throw new Error("LLM requests require userInitiated: true");
  }
}

/**
 * @param {{
 *   getKey: (provider: string) => string | null;
 *   bookFs: {
 *     getBookRoot: () => string;
 *     isBookApproved: (bookPath: string) => boolean;
 *     listFiles: () => string[];
 *     readFile: (rel: string) => string;
 *   };
 *   runLlmStream: (
 *     request: import("@inscriva/bridge").LlmRequest,
 *     bookFiles: Map<string, string>,
 *     apiKey: string,
 *   ) => AsyncIterable<string>;
 *   loadBookFiles?: typeof loadBookFilesMap;
 * }} deps
 */
export function createLlmStreamRunner(deps) {
  const loadFiles = deps.loadBookFiles ?? loadBookFilesMap;

  /**
   * @param {{
   *   send: (channel: string, payload: unknown) => void;
   *   requestId: string;
   *   request: import("@inscriva/bridge").LlmRequest;
   *   signal?: AbortSignal;
   * }} opts
   */
  async function runStream({ send, requestId, request, signal }) {
    assertUserInitiated(request);

    const resolvedBookId = path.resolve(request.bookId);
    if (!deps.bookFs.isBookApproved(resolvedBookId)) {
      throw new Error(
        "Book path is not approved; pick a folder or open a recent book",
      );
    }

    const openRoot = path.resolve(deps.bookFs.getBookRoot());
    if (openRoot !== resolvedBookId) {
      throw new Error("Request bookId does not match the open book");
    }

    const apiKey = deps.getKey(request.provider);
    if (!apiKey) {
      throw new Error(`No API key configured for ${request.provider}`);
    }

    const bookFiles = loadFiles(deps.bookFs);

    try {
      for await (const text of deps.runLlmStream(request, bookFiles, apiKey)) {
        if (signal?.aborted) {
          return;
        }
        send(LLM_IPC.CHUNK, { requestId, text });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      send(LLM_IPC.ERROR, { requestId, error: message });
    }

    if (!signal?.aborted) {
      send(LLM_IPC.DONE, { requestId });
    }
  }

  return { runStream };
}

/**
 * @param {{
 *   ipcMain: {
 *     handle: (
 *       channel: string,
 *       listener: (event: { sender: { send: (channel: string, payload: unknown) => void } }, payload: unknown) => Promise<void>,
 *     ) => void;
 *   };
 *   getKey: (provider: string) => string | null;
 *   bookFs: Parameters<typeof createLlmStreamRunner>[0]["bookFs"];
 *   runLlmStream: Parameters<typeof createLlmStreamRunner>[0]["runLlmStream"];
 * }} deps
 */
export function registerLlmIpc(deps) {
  const runner = createLlmStreamRunner(deps);
  /** @type {Map<string, AbortController>} */
  const aborts = new Map();

  deps.ipcMain.handle(
    LLM_IPC.START,
    async (event, /** @type {{ requestId: string, request: import("@inscriva/bridge").LlmRequest }} */ payload) => {
      const { requestId, request } = payload;
      const controller = new AbortController();
      aborts.set(requestId, controller);

      const send = (channel, data) => {
        event.sender.send(channel, data);
      };

      try {
        await runner.runStream({
          send,
          requestId,
          request,
          signal: controller.signal,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        send(LLM_IPC.ERROR, { requestId, error: message });
        send(LLM_IPC.DONE, { requestId });
      } finally {
        aborts.delete(requestId);
      }
    },
  );

  deps.ipcMain.handle(LLM_IPC.CANCEL, (_event, /** @type {string} */ requestId) => {
    aborts.get(requestId)?.abort();
    aborts.delete(requestId);
  });
}