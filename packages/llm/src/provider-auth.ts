import type { LlmProviderId } from "./types.js";

export type LlmOAuthStatus = "not_available" | "planned";

export interface LlmProviderAuthInfo {
  id: LlmProviderId;
  authMethod: "api_key";
  oauthStatus: LlmOAuthStatus;
  /** Short UI hint for Settings */
  hint: string;
}

/** v1: BYOK API keys only. OAuth tracked per vendor for Phase 3+. */
export const LLM_PROVIDER_AUTH: LlmProviderAuthInfo[] = [
  {
    id: "openai",
    authMethod: "api_key",
    oauthStatus: "not_available",
    hint: "Create an API key at platform.openai.com — ChatGPT Plus does not include API access.",
  },
  {
    id: "anthropic",
    authMethod: "api_key",
    oauthStatus: "not_available",
    hint: "Create an API key at console.anthropic.com — Claude Pro is separate from API billing.",
  },
  {
    id: "google",
    authMethod: "api_key",
    oauthStatus: "planned",
    hint: "Use an AI Studio / Vertex API key for now. Google sign-in for API access is planned.",
  },
  {
    id: "custom",
    authMethod: "api_key",
    oauthStatus: "not_available",
    hint: "OpenAI-compatible endpoint (e.g. Ollama). Set base URL below; key optional for local servers.",
  },
];

export function authInfoForProvider(
  provider: LlmProviderId,
): LlmProviderAuthInfo | undefined {
  return LLM_PROVIDER_AUTH.find((entry) => entry.id === provider);
}

export function providersWithOAuthPlanned(): LlmProviderId[] {
  return LLM_PROVIDER_AUTH.filter((entry) => entry.oauthStatus === "planned").map(
    (entry) => entry.id,
  );
}
