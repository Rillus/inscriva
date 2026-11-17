import type {
  BookHandle,
  BridgeCapabilities,
  FileEvent,
  GitCloneOptions,
  GitCloneRemoteOptions,
  GitHostProvider,
  GitHostStatus,
  GitOAuthStart,
  GitRemoteRepo,
  GitRepoInfo,
  GitStatus,
  InscrivaBridge,
  LlmRequest,
  NewBookOptions,
  PickFolderOptions,
  ProviderStatus,
} from "./types.js";

const NOT_AVAILABLE = "Not available in the Electron shell yet";

export interface ElectronKeysApi {
  setApiKey(provider: string, key: string): Promise<void>;
  clearApiKey(provider: string): Promise<void>;
  listProviders(): Promise<ProviderStatus[]>;
}

export interface ElectronBookApi {
  openBook(path: string): Promise<BookHandle>;
  listFiles(): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  renameFile(from: string, to: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  getRecents(): Promise<string[]>;
  addRecent(path: string): Promise<void>;
  getBooksLibraryPath(): Promise<string>;
  pickBookFolder(options?: PickFolderOptions): Promise<string | null>;
}

export interface ElectronLlmStreamPayload {
  requestId: string;
  text?: string;
  error?: string;
}

export interface ElectronLlmApi {
  startStream(request: LlmRequest, requestId: string): Promise<void>;
  cancelStream(requestId: string): Promise<void>;
  onChunk(
    handler: (payload: { requestId: string; text: string }) => void,
  ): () => void;
  onError(
    handler: (payload: { requestId: string; error: string }) => void,
  ): () => void;
  onDone(handler: (payload: { requestId: string }) => void): () => void;
}

export interface InscrivaElectronApi {
  platform: "electron";
  book: ElectronBookApi;
  keys?: ElectronKeysApi;
  llm?: ElectronLlmApi;
}

function unavailable(): never {
  throw new Error(NOT_AVAILABLE);
}

/** Electron preload book IPC wrapped as an InscrivaBridge (partial native surface). */
function newLlmRequestId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `llm-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function createElectronBridge(api: InscrivaElectronApi): InscrivaBridge {
  const { book, keys, llm } = api;

  return {
    async getCapabilities(): Promise<BridgeCapabilities> {
      return {
        folderPicker: true,
        gitClone: false,
        gitPull: false,
        gitInspect: false,
        gitOAuth: false,
        platform: "electron",
      };
    },

    async openBook(path: string) {
      return book.openBook(path);
    },

    async listFiles() {
      return book.listFiles();
    },

    async readFile(path: string) {
      return book.readFile(path);
    },

    async writeFile(path: string, content: string) {
      return book.writeFile(path, content);
    },

    async renameFile(from: string, to: string) {
      return book.renameFile(from, to);
    },

    async deleteFile(path: string) {
      return book.deleteFile(path);
    },

    async getRecents() {
      return book.getRecents();
    },

    async addRecent(path: string) {
      return book.addRecent(path);
    },

    async getBooksLibraryPath() {
      return book.getBooksLibraryPath();
    },

    watchBook(_callback: (event: FileEvent) => void) {
      return () => {};
    },

    async gitPull() {
      unavailable();
    },

    async gitAutosave() {
      unavailable();
    },

    async gitStatus(): Promise<GitStatus> {
      unavailable();
    },

    async gitInspect(_path: string): Promise<GitRepoInfo> {
      unavailable();
    },

    async gitClone(_options: GitCloneOptions): Promise<BookHandle> {
      unavailable();
    },

    async pickBookFolder(options?: PickFolderOptions): Promise<string | null> {
      return book.pickBookFolder(options);
    },

    async gitOAuthStart(_provider: GitHostProvider): Promise<GitOAuthStart> {
      unavailable();
    },

    async gitOAuthStatus(_provider: GitHostProvider): Promise<GitHostStatus> {
      unavailable();
    },

    async gitOAuthDisconnect(_provider: GitHostProvider): Promise<void> {
      unavailable();
    },

    async gitListRemoteRepos(
      _provider: GitHostProvider,
    ): Promise<GitRemoteRepo[]> {
      unavailable();
    },

    async gitCloneRemote(
      _options: GitCloneRemoteOptions,
    ): Promise<BookHandle> {
      unavailable();
    },

    async createBook(_options: NewBookOptions): Promise<BookHandle> {
      unavailable();
    },

    async setApiKey(provider: string, key: string): Promise<void> {
      if (keys) {
        await keys.setApiKey(provider, key);
        return;
      }
      unavailable();
    },

    async clearApiKey(provider: string): Promise<void> {
      if (keys) {
        await keys.clearApiKey(provider);
        return;
      }
      unavailable();
    },

    async listProviders(): Promise<ProviderStatus[]> {
      if (keys) {
        return keys.listProviders();
      }
      return [];
    },

    llmStream(request: LlmRequest): AsyncIterable<string> {
      if (!llm) {
        return {
          [Symbol.asyncIterator]() {
            return {
              next() {
                return Promise.reject(new Error(NOT_AVAILABLE));
              },
            };
          },
        };
      }

      const llmApi = llm;
      const requestId = newLlmRequestId();

      return {
        async *[Symbol.asyncIterator]() {
          const queue: string[] = [];
          let resolveWait: (() => void) | null = null;
          let done = false;
          let streamError: string | null = null;

          const wake = () => {
            resolveWait?.();
            resolveWait = null;
          };

          const unlistenChunk = llmApi.onChunk((payload) => {
            if (payload.requestId !== requestId) return;
            if (payload.text) queue.push(payload.text);
            wake();
          });
          const unlistenError = llmApi.onError((payload) => {
            if (payload.requestId !== requestId) return;
            streamError = payload.error ?? "LLM stream failed";
            done = true;
            wake();
          });
          const unlistenDone = llmApi.onDone((payload) => {
            if (payload.requestId !== requestId) return;
            done = true;
            wake();
          });

          try {
            await llmApi.startStream(request, requestId);

            while (!done || queue.length > 0) {
              if (streamError) throw new Error(streamError);
              while (queue.length > 0) {
                yield queue.shift()!;
              }
              if (done) break;
              await new Promise<void>((resolve) => {
                resolveWait = resolve;
              });
            }
            if (streamError) throw new Error(streamError);
          } finally {
            unlistenChunk();
            unlistenError();
            unlistenDone();
          }
        },
      };
    },
  };
}
