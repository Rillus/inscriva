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
}

export interface InscrivaElectronApi {
  platform: "electron";
  book: ElectronBookApi;
}

function unavailable(): never {
  throw new Error(NOT_AVAILABLE);
}

/** Electron preload book IPC wrapped as an InscrivaBridge (partial native surface). */
export function createElectronBridge(api: InscrivaElectronApi): InscrivaBridge {
  const { book } = api;

  return {
    async getCapabilities(): Promise<BridgeCapabilities> {
      return {
        folderPicker: false,
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

    async pickBookFolder(_options?: PickFolderOptions): Promise<string | null> {
      unavailable();
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

    async setApiKey(_provider: string, _key: string): Promise<void> {
      unavailable();
    },

    async clearApiKey(_provider: string): Promise<void> {
      unavailable();
    },

    async listProviders(): Promise<ProviderStatus[]> {
      return [];
    },

    llmStream(_request: LlmRequest): AsyncIterable<string> {
      return {
        [Symbol.asyncIterator]() {
          return {
            next() {
              return Promise.reject(new Error(NOT_AVAILABLE));
            },
          };
        },
      };
    },
  };
}
