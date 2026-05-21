import type { LlmProviderId } from "./types.js";

/** Sensible defaults — user can override in Settings. */
export const DEFAULT_MODELS: Record<
  LlmProviderId,
  { default: string; fast: string }
> = {
  openai: { default: "gpt-4o", fast: "gpt-4o-mini" },
  anthropic: { default: "claude-sonnet-4-20250514", fast: "claude-3-5-haiku-20241022" },
  google: { default: "gemini-3.1-flash-lite", fast: "gemini-2.0-flash-lite" },
  custom: { default: "local-model", fast: "local-model" },
};

export function defaultModelForProvider(provider: LlmProviderId): string {
  return DEFAULT_MODELS[provider].default;
}
