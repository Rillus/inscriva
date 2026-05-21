import type {
  BookHandle,
  FileEvent,
  GitStatus,
  InscrivaBridge,
  LlmRequest,
  ProviderStatus,
} from "./types.js";

export interface MockBook {
  path: string;
  title: string;
  files: Map<string, string>;
}

function anchorSidecarPath(filePath: string): string {
  const safe = filePath.replace(/[/\\]/g, "__");
  return `.inscriva/anchors/${safe}.json`;
}

export function createMockBridge(book: MockBook): InscrivaBridge {
  const watchers = new Set<(event: FileEvent) => void>();

  const handle: BookHandle = {
    id: book.path,
    path: book.path,
    title: book.title,
  };

  return {
    async listFiles() {
      return [...book.files.keys()];
    },

    async getRecents() {
      return [book.path];
    },

    async addRecent() {
      /* no-op */
    },

    async createBook(opts) {
      return {
        id: opts.path,
        path: opts.path,
        title: opts.title,
      };
    },

    async pickBookFolder() {
      return null;
    },

    async gitInspect(path: string) {
      return { path, isRepo: false, remotes: [] };
    },

    async gitClone() {
      throw new Error("Git clone requires the native bridge");
    },

    async gitOAuthStart() {
      return { url: null, configured: false };
    },

    async gitOAuthStatus() {
      return { connected: false, configured: false };
    },

    async gitOAuthDisconnect() {
      /* no-op */
    },

    async gitListRemoteRepos() {
      return [];
    },

    async gitCloneRemote() {
      throw new Error("GitHub clone requires the native bridge");
    },

    async openBook(path: string) {
      if (path !== book.path) {
        throw new Error(`Unknown book: ${path}`);
      }
      return handle;
    },

    async readFile(path: string) {
      const content = book.files.get(path);
      if (content === undefined) {
        throw new Error(`File not found: ${path}`);
      }
      return content;
    },

    async writeFile(path: string, content: string) {
      book.files.set(path, content);
      for (const cb of watchers) {
        cb({ path, kind: "modified" });
      }
    },

    async renameFile(from: string, to: string) {
      const content = book.files.get(from);
      if (content === undefined) {
        throw new Error(`File not found: ${from}`);
      }
      if (book.files.has(to)) {
        throw new Error(`File already exists: ${to}`);
      }
      book.files.delete(from);
      book.files.set(to, content);
      const sidecarFrom = anchorSidecarPath(from);
      const sidecarTo = anchorSidecarPath(to);
      const sidecar = book.files.get(sidecarFrom);
      if (sidecar !== undefined) {
        book.files.delete(sidecarFrom);
        try {
          const data = JSON.parse(sidecar) as { file?: string };
          data.file = to;
          book.files.set(sidecarTo, JSON.stringify(data, null, 2));
        } catch {
          book.files.set(sidecarTo, sidecar);
        }
      }
      for (const cb of watchers) {
        cb({ path: to, kind: "modified" });
      }
    },

    watchBook(callback) {
      watchers.add(callback);
      return () => watchers.delete(callback);
    },

    async gitPull() {
      /* no-op in mock */
    },

    async gitAutosave() {
      /* no-op in mock */
    },

    async gitStatus(): Promise<GitStatus> {
      return { ahead: 0, behind: 0, dirty: false };
    },

    async setApiKey() {
      /* no-op in mock */
    },

    async clearApiKey() {
      /* no-op in mock */
    },

    async listProviders(): Promise<ProviderStatus[]> {
      return [
        { provider: "openai", configured: false },
        { provider: "anthropic", configured: false },
        { provider: "google", configured: false },
      ];
    },

    async *llmStream(request: LlmRequest) {
      yield `[mock ${request.taskId}] `;
      yield "Connect the dev bridge (pnpm dev:bridge) and add an API key in Settings to stream from a provider.";
    },
  };
}
