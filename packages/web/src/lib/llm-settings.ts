import type { ProviderStatus } from "@inscriva/bridge";
import { defaultModelForProvider, type LlmProviderId } from "@inscriva/llm";

export type { LlmProviderId };

const STORAGE_KEY = "inscriva.llm.models";
const PROVIDER_STORAGE_KEY = "inscriva.llm.provider";

export const LLM_PROVIDERS: LlmProviderId[] = [
  "openai",
  "anthropic",
  "google",
  "custom",
];

const CUSTOM_BASE_URL_KEY = "inscriva.llm.customBaseUrl";
export const DEFAULT_CUSTOM_BASE_URL = "http://127.0.0.1:11434/v1";

export function loadModelOverrides(): Partial<Record<LlmProviderId, string>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<LlmProviderId, string>>;
  } catch {
    return {};
  }
}

export function saveModelOverride(
  provider: LlmProviderId,
  model: string,
): void {
  const current = loadModelOverrides();
  current[provider] = model.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function modelForProvider(provider: LlmProviderId): string {
  return loadModelOverrides()[provider] ?? defaultModelForProvider(provider);
}

export function loadPreferredProvider(): LlmProviderId | null {
  try {
    const raw = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (!raw) return null;
    return LLM_PROVIDERS.includes(raw as LlmProviderId)
      ? (raw as LlmProviderId)
      : null;
  } catch {
    return null;
  }
}

export function savePreferredProvider(provider: LlmProviderId): void {
  localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
}

export function loadCustomBaseUrl(): string {
  try {
    return localStorage.getItem(CUSTOM_BASE_URL_KEY)?.trim() || DEFAULT_CUSTOM_BASE_URL;
  } catch {
    return DEFAULT_CUSTOM_BASE_URL;
  }
}

export function saveCustomBaseUrl(url: string): void {
  localStorage.setItem(CUSTOM_BASE_URL_KEY, url.trim());
}

export function providerBaseUrlFor(provider: LlmProviderId): string | undefined {
  if (provider !== "custom") return undefined;
  return loadCustomBaseUrl();
}

/** Pick the LLM provider to use: saved preference if configured, else first configured. */
export function pickLlmProvider(
  statuses: ProviderStatus[],
): LlmProviderId | null {
  const configured = new Set(
    statuses
      .filter((s) => s.configured)
      .map((s) => s.provider)
      .filter((id): id is LlmProviderId =>
        LLM_PROVIDERS.includes(id as LlmProviderId),
      ),
  );
  if (configured.size === 0) return null;

  const preferred = loadPreferredProvider();
  if (preferred && configured.has(preferred)) return preferred;

  for (const id of LLM_PROVIDERS) {
    if (configured.has(id)) return id;
  }
  return null;
}

export function missingLlmProviderMessage(): string {
  return "No LLM API key configured. Open Settings → API keys and add a key for OpenAI, Anthropic, Google, or Custom (Ollama).";
}

export function noApiKeyForProviderMessage(provider: LlmProviderId): string {
  return `No API key configured for ${provider}. Open Settings → API keys, or set ${providerEnvVar(provider)} in apps/dev-bridge/.env and restart the bridge.`;
}

function providerEnvVar(provider: LlmProviderId): string {
  switch (provider) {
    case "openai":
      return "OPENAI_API_KEY";
    case "anthropic":
      return "ANTHROPIC_API_KEY";
    case "google":
      return "GOOGLE_API_KEY";
    case "custom":
      return "CUSTOM_API_KEY (any value for local Ollama)";
    default:
      return "API key env var";
  }
}
