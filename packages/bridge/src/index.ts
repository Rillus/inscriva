export type {
  BookConfig,
  BookHandle,
  BridgeCapabilities,
  FileEvent,
  GitCloneOptions,
  GitCloneRemoteOptions,
  GitHostAccount,
  GitHostDisconnected,
  GitHostProvider,
  GitHostStatus,
  GitOAuthStart,
  GitRemoteInfo,
  GitRemoteRepo,
  GitRepoInfo,
  GitStatus,
  PickFolderOptions,
  Host,
  InscrivaBridge,
  LlmRequest,
  LlmTaskId,
  NewBookOptions,
  ProviderStatus,
} from "./types.js";

export { capabilitiesFromBridge } from "./capabilities.js";
export { repoNameFromUrl } from "./git-utils.js";
export { detectHost, getBridge, installBridge } from "./host.js";
export { createHttpBridge } from "./http-bridge.js";
export { createMockBridge, type MockBook } from "./mock-bridge.js";
