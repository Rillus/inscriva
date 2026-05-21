import type { LlmTaskId } from "@inscriva/bridge";

export type LlmProviderId = "openai" | "anthropic" | "google" | "custom";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ContextSection {
  label: string;
  path?: string;
  chars: number;
  included: boolean;
}

export interface AssembledContext {
  system: string;
  user: string;
  sections: ContextSection[];
  estimatedTokens: number;
}

export interface ContextInput {
  taskId: LlmTaskId;
  bookFiles: Map<string, string>;
  chapterKey?: string;
  selectionText?: string;
  draftExcerpt?: string;
  chapterFocus?: string;
  relevantCanon?: string;
  userMessage?: string;
  /** Rough character budget for bundled context (default 24_000). */
  maxChars?: number;
}

export interface ProviderStreamConfig {
  apiKey: string;
  model: string;
  baseUrl?: string;
  maxOutputTokens?: number;
}
