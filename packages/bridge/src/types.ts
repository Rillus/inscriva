export type Host = "bridge" | "browser";

export type GitHostProvider = "github";

export interface BookHandle {
  id: string;
  path: string;
  title: string;
}

export interface BookConfig {
  bookTitle: string;
  remote?: string;
  branch?: string;
  autosaveIdleSeconds?: number;
}

export interface FileEvent {
  path: string;
  kind: "created" | "modified" | "deleted";
}

export interface GitStatus {
  ahead: number;
  behind: number;
  dirty: boolean;
  lastError?: string;
}

export interface ProviderStatus {
  provider: string;
  configured: boolean;
}

export type LlmTaskId =
  | "draft-scene"
  | "expand-outline"
  | "review-continuity"
  | "review-voice"
  | "review-structure"
  | "fix-paragraph"
  | "brainstorm"
  | "explain-canon";

export interface LlmRequest {
  taskId: LlmTaskId;
  provider: "openai" | "anthropic" | "google" | "custom";
  model: string;
  bookId: string;
  chapterKey?: string;
  anchorId?: string;
  selection?: { from: number; to: number };
  /** Plain-text selection sent from the editor (Phase 2). */
  selectionText?: string;
  /** Surrounding draft excerpt for review tasks. */
  draftExcerpt?: string;
  /** Parsed chapter outline focus (scene, turn, must-include, etc.). */
  chapterFocus?: string;
  /** Canon entries relevant to the current passage (names detected in draft). */
  relevantCanon?: string;
  userMessage?: string;
  /** Cap on completion tokens for this request. */
  maxOutputTokens?: number;
}

export interface NewBookOptions {
  title: string;
  path: string;
  initGit?: boolean;
}

export interface GitCloneOptions {
  url: string;
  /** Parent directory; repo is cloned into `parentPath/<repo-name>`. */
  parentPath: string;
}

export interface GitCloneRemoteOptions {
  provider: GitHostProvider;
  /** e.g. `owner/repo` */
  fullName: string;
  parentPath: string;
}

export interface GitRemoteInfo {
  name: string;
  url: string;
}

export interface GitRepoInfo {
  path: string;
  isRepo: boolean;
  branch?: string;
  remotes: GitRemoteInfo[];
  dirty?: boolean;
  ahead?: number;
  behind?: number;
}

export interface PickFolderOptions {
  prompt?: string;
}

export interface GitHostAccount {
  provider: GitHostProvider;
  username: string;
  connected: true;
}

export interface GitHostDisconnected {
  connected: false;
  configured: boolean;
}

export type GitHostStatus = GitHostAccount | GitHostDisconnected;

export interface GitRemoteRepo {
  provider: GitHostProvider;
  id: number;
  fullName: string;
  name: string;
  cloneUrl: string;
  private: boolean;
  updatedAt: string;
  description?: string;
}

export interface GitOAuthStart {
  url: string | null;
  configured: boolean;
}

export interface BridgeCapabilities {
  folderPicker: boolean;
  gitClone: boolean;
  gitPull: boolean;
  gitInspect: boolean;
  gitOAuth: boolean;
}

export interface InscrivaBridge {
  getCapabilities?(): Promise<BridgeCapabilities>;
  openBook(path: string): Promise<BookHandle>;
  pickBookFolder?(options?: PickFolderOptions): Promise<string | null>;
  gitInspect?(path: string): Promise<GitRepoInfo>;
  gitClone?(options: GitCloneOptions): Promise<BookHandle>;
  gitOAuthStart?(provider: GitHostProvider): Promise<GitOAuthStart>;
  gitOAuthStatus?(provider: GitHostProvider): Promise<GitHostStatus>;
  gitOAuthDisconnect?(provider: GitHostProvider): Promise<void>;
  gitListRemoteRepos?(provider: GitHostProvider): Promise<GitRemoteRepo[]>;
  gitCloneRemote?(options: GitCloneRemoteOptions): Promise<BookHandle>;
  listFiles(): Promise<string[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  renameFile(from: string, to: string): Promise<void>;
  watchBook(callback: (event: FileEvent) => void): () => void;
  gitPull(): Promise<void>;
  gitAutosave(message?: string): Promise<void>;
  gitStatus(): Promise<GitStatus>;
  getRecents(): Promise<string[]>;
  addRecent(path: string): Promise<void>;
  createBook(options: NewBookOptions): Promise<BookHandle>;
  setApiKey(provider: string, key: string): Promise<void>;
  clearApiKey(provider: string): Promise<void>;
  listProviders(): Promise<ProviderStatus[]>;
  llmStream(request: LlmRequest): AsyncIterable<string>;
}
