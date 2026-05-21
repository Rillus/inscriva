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
import { mergeApiHeaders, parseApiErrorBody } from "./http-api.js";
import { readSseJson } from "./sse.js";

export function createHttpBridge(baseUrl: string): InscrivaBridge {
  const url = baseUrl.replace(/\/$/, "");

  async function api<T>(
    path: string,
    init?: RequestInit,
  ): Promise<T> {
    const res = await fetch(`${url}${path}`, {
      ...init,
      headers: mergeApiHeaders(init),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(body || res.statusText);
    }
    if (res.status === 204) return undefined as T;
    return res.json() as Promise<T>;
  }

  let cachedCapabilities: BridgeCapabilities | null = null;

  return {
    async getCapabilities() {
      if (cachedCapabilities) return cachedCapabilities;
      try {
        cachedCapabilities = await api<BridgeCapabilities>("/capabilities");
      } catch {
        cachedCapabilities = {
          folderPicker: false,
          gitClone: false,
          gitPull: true,
          gitInspect: false,
          gitOAuth: false,
        };
      }
      return cachedCapabilities;
    },

    async openBook(path: string) {
      return api<BookHandle>("/book/open", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
    },

    async pickBookFolder(options?: PickFolderOptions) {
      const { path: chosen } = await api<{ path: string | null }>("/book/pick", {
        method: "POST",
        body: JSON.stringify({
          prompt: options?.prompt ?? "Select your book folder",
        }),
      });
      return chosen;
    },

    async gitInspect(repoPath: string) {
      return api<GitRepoInfo>("/git/inspect", {
        method: "POST",
        body: JSON.stringify({ path: repoPath }),
      });
    },

    async gitClone(options: GitCloneOptions) {
      return api<BookHandle>("/git/clone", {
        method: "POST",
        body: JSON.stringify(options),
      });
    },

    async gitOAuthStart(provider: GitHostProvider) {
      if (provider !== "github") throw new Error(`Unsupported provider: ${provider}`);
      return api<GitOAuthStart>("/git/github/oauth/start");
    },

    async gitOAuthStatus(provider: GitHostProvider) {
      if (provider !== "github") throw new Error(`Unsupported provider: ${provider}`);
      return api<GitHostStatus>("/git/github/status");
    },

    async gitOAuthDisconnect(provider: GitHostProvider) {
      if (provider !== "github") throw new Error(`Unsupported provider: ${provider}`);
      await api("/git/github/disconnect", { method: "DELETE" });
    },

    async gitListRemoteRepos(provider: GitHostProvider) {
      if (provider !== "github") throw new Error(`Unsupported provider: ${provider}`);
      const { repos } = await api<{ repos: GitRemoteRepo[] }>("/git/github/repos");
      return repos;
    },

    async gitCloneRemote(options: GitCloneRemoteOptions) {
      if (options.provider !== "github") {
        throw new Error(`Unsupported provider: ${options.provider}`);
      }
      return api<BookHandle>("/git/github/clone", {
        method: "POST",
        body: JSON.stringify({
          fullName: options.fullName,
          parentPath: options.parentPath,
        }),
      });
    },

    async listFiles() {
      const { files } = await api<{ files: string[] }>("/book/files");
      return files;
    },

    async readFile(path: string) {
      const { content } = await api<{ content: string }>(
        `/book/file?path=${encodeURIComponent(path)}`,
      );
      return content;
    },

    async writeFile(path: string, content: string) {
      await api("/book/file", {
        method: "PUT",
        body: JSON.stringify({ path, content }),
      });
    },

    async renameFile(from: string, to: string) {
      await api("/book/file/rename", {
        method: "POST",
        body: JSON.stringify({ from, to }),
      });
    },

    watchBook(callback) {
      const wsUrl = url.replace(/^http/, "ws") + "/watch";
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data as string) as FileEvent & {
          type?: string;
        };
        if (data.type === "github-connected") return;
        if (data.path && data.kind) callback(data);
      };

      return () => ws.close();
    },

    async gitPull() {
      await api("/git/pull", { method: "POST" });
    },

    async gitAutosave(message?: string) {
      await api("/git/autosave", {
        method: "POST",
        body: JSON.stringify({ message }),
      });
    },

    async gitStatus() {
      return api<GitStatus>("/git/status");
    },

    async getRecents() {
      const { recents } = await api<{ recents: string[] }>("/recents");
      return recents;
    },

    async addRecent(path: string) {
      await api("/recents", {
        method: "POST",
        body: JSON.stringify({ path }),
      });
    },

    async createBook(options: NewBookOptions) {
      return api<BookHandle>("/book/create", {
        method: "POST",
        body: JSON.stringify(options),
      });
    },

    async setApiKey(provider: string, key: string) {
      await api("/keys", {
        method: "PUT",
        body: JSON.stringify({ provider, key }),
      });
    },

    async clearApiKey(provider: string) {
      await api(`/keys/${encodeURIComponent(provider)}`, {
        method: "DELETE",
      });
    },

    async listProviders() {
      const { providers } = await api<{ providers: ProviderStatus[] }>(
        "/keys",
      );
      return providers;
    },

    async *llmStream(request: LlmRequest) {
      const body = JSON.stringify(request);
      const res = await fetch(`${url}/llm/stream`, {
        method: "POST",
        body,
        headers: mergeApiHeaders({ method: "POST", body }),
      });
      if (!res.ok) {
        const detail = await res.text();
        throw new Error(parseApiErrorBody(detail, res.statusText));
      }
      if (!res.body) throw new Error("LLM stream had no body");

      for await (const event of readSseJson<{ text?: string; error?: string }>(
        res.body,
      )) {
        if (event === "[DONE]") return;
        if (event.error) throw new Error(event.error);
        if (event.text) yield event.text;
      }
    },
  };
}
