import { invoke } from "@tauri-apps/api/core";
import { parseBookFilePayload } from "./file-events.js";
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
  PickFolderOptions,
  InscrivaBridge,
  LlmRequest,
  NewBookOptions,
  ProviderStatus,
} from "./types.js";

export type MenuAction =
  | "open_book"
  | "new_book"
  | "pull"
  | "close_book"
  | "mode_draft"
  | "mode_revise"
  | "mode_read";

let fileWatchBootstrapped = false;

async function ensureFileWatchListeners(
  watchers: Set<(event: FileEvent) => void>,
): Promise<void> {
  if (fileWatchBootstrapped) return;
  fileWatchBootstrapped = true;
  try {
    const { listen } = await import("@tauri-apps/api/event");
    await listen<unknown>("book-file", (event) => {
      const fileEvent = parseBookFilePayload(event.payload);
      if (!fileEvent) return;
      for (const cb of watchers) {
        cb(fileEvent);
      }
    });
  } catch {
    fileWatchBootstrapped = false;
  }
}

/** Tauri native bridge — install when running inside the desktop shell. */
export function createTauriBridge(): InscrivaBridge {
  const watchers = new Set<(event: FileEvent) => void>();

  return {
    async getCapabilities(): Promise<BridgeCapabilities> {
      let gitOAuth = false;
      try {
        const status = await invoke<GitHostStatus>("github_oauth_status");
        gitOAuth =
          "configured" in status ? Boolean(status.configured) : false;
      } catch {
        gitOAuth = false;
      }
      return {
        folderPicker: true,
        gitClone: true,
        gitPull: true,
        gitInspect: true,
        gitOAuth,
      };
    },

    async openBook(path: string) {
      return invoke<BookHandle>("open_book", { path });
    },

    async pickBookFolder(options?: PickFolderOptions) {
      const { open } = await import("@tauri-apps/plugin-dialog");
      const selected = await open({
        directory: true,
        multiple: false,
        title: options?.prompt ?? "Select your book folder",
      });
      return typeof selected === "string" ? selected : null;
    },

    async gitInspect(repoPath: string) {
      return invoke<GitRepoInfo>("git_inspect", { path: repoPath });
    },

    async gitClone(options: GitCloneOptions) {
      return invoke<BookHandle>("git_clone", {
        url: options.url,
        parentPath: options.parentPath,
      });
    },

    async gitOAuthStart(provider: GitHostProvider) {
      if (provider !== "github") {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      return invoke<GitOAuthStart>("github_oauth_start");
    },

    async gitOAuthStatus(provider: GitHostProvider) {
      if (provider !== "github") {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      return invoke<GitHostStatus>("github_oauth_status");
    },

    async gitOAuthDisconnect(provider: GitHostProvider) {
      if (provider !== "github") {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      await invoke("github_oauth_disconnect");
    },

    async gitListRemoteRepos(provider: GitHostProvider) {
      if (provider !== "github") {
        throw new Error(`Unsupported provider: ${provider}`);
      }
      return invoke<GitRemoteRepo[]>("github_list_repos");
    },

    async gitCloneRemote(options: GitCloneRemoteOptions) {
      if (options.provider !== "github") {
        throw new Error(`Unsupported provider: ${options.provider}`);
      }
      return invoke<BookHandle>("github_clone_remote", {
        fullName: options.fullName,
        parentPath: options.parentPath,
      });
    },

    async listFiles() {
      return invoke<string[]>("list_files");
    },

    async readFile(path: string) {
      return invoke<string>("read_file", { path });
    },

    async writeFile(path: string, content: string) {
      await invoke("write_file", { path, content });
    },

    async renameFile(from: string, to: string) {
      await invoke("rename_file", { from, to });
    },

    watchBook(callback) {
      watchers.add(callback);
      void ensureFileWatchListeners(watchers);
      return () => watchers.delete(callback);
    },

    async gitPull() {
      const result = await invoke<{ pulled: boolean; skipped?: string }>("git_pull");
      if (result.skipped) {
        throw new Error(result.skipped);
      }
    },

    async gitAutosave(message?: string) {
      await invoke("git_autosave", { message });
    },

    async gitStatus() {
      return invoke<GitStatus>("git_status");
    },

    async getRecents() {
      return invoke<string[]>("get_recents");
    },

    async addRecent(path: string) {
      await invoke("add_recent", { path });
    },

    async createBook(options: NewBookOptions) {
      return invoke<BookHandle>("create_book", {
        options: {
          title: options.title,
          path: options.path,
          init_git: options.initGit ?? true,
        },
      });
    },

    async setApiKey(provider: string, key: string) {
      await invoke("set_api_key", { provider, key });
    },

    async clearApiKey(provider: string) {
      await invoke("clear_api_key", { provider });
    },

    async listProviders() {
      return invoke<ProviderStatus[]>("list_providers");
    },

    async *llmStream(request: LlmRequest) {
      const { listen } = await import("@tauri-apps/api/event");

      type ChunkPayload = { text: string };
      type ErrorPayload = { error: string };

      const queue: string[] = [];
      let resolveWait: (() => void) | null = null;
      let done = false;
      let streamError: string | null = null;

      const wake = () => {
        resolveWait?.();
        resolveWait = null;
      };

      const unlistenChunk = await listen<ChunkPayload>("llm-chunk", (event) => {
        if (event.payload?.text) queue.push(event.payload.text);
        wake();
      });
      const unlistenError = await listen<ErrorPayload>("llm-error", (event) => {
        streamError = event.payload?.error ?? "LLM stream failed";
        done = true;
        wake();
      });
      const unlistenDone = await listen("llm-done", () => {
        done = true;
        wake();
      });

      try {
        await invoke("llm_stream", { request });

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
}

export async function bindTauriMenu(
  handler: (action: MenuAction) => void,
): Promise<() => void> {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen<string>("menu-action", (event) => {
      handler(event.payload as MenuAction);
    });
  } catch {
    return () => {};
  }
}

export async function onGithubConnected(
  handler: (username: string) => void,
): Promise<() => void> {
  try {
    const { listen } = await import("@tauri-apps/api/event");
    return await listen<{ username: string }>("github-connected", (event) => {
      if (event.payload?.username) handler(event.payload.username);
    });
  } catch {
    return () => {};
  }
}
