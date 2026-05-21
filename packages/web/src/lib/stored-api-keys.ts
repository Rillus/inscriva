import type { InscrivaBridge, ProviderStatus } from "@inscriva/bridge";
import type { LlmProviderId } from "./llm-settings.js";
import { LLM_PROVIDERS } from "./llm-settings.js";

const STORAGE_KEY = "inscriva.api.keys";

export function loadStoredApiKeys(): Partial<Record<LlmProviderId, string>> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Partial<Record<LlmProviderId, string>>;
  } catch {
    return {};
  }
}

export function saveStoredApiKey(provider: LlmProviderId, key: string): void {
  const keys = loadStoredApiKeys();
  keys[provider] = key.trim();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

export function clearStoredApiKey(provider: LlmProviderId): void {
  const keys = loadStoredApiKeys();
  delete keys[provider];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
}

function defaultProviderStatuses(): ProviderStatus[] {
  return LLM_PROVIDERS.map((provider) => ({ provider, configured: false }));
}

function mergeProviderStatuses(remote: ProviderStatus[]): ProviderStatus[] {
  const stored = loadStoredApiKeys();
  return defaultProviderStatuses().map((row) => {
    const fromRemote = remote.find((p) => p.provider === row.provider);
    return {
      provider: row.provider,
      configured:
        Boolean(fromRemote?.configured) || Boolean(stored[row.provider as LlmProviderId]),
    };
  });
}

/** Push browser-stored keys to the active bridge (e.g. after dev-bridge restart). */
export async function syncStoredKeysToBridge(bridge: InscrivaBridge): Promise<void> {
  const stored = loadStoredApiKeys();
  for (const provider of LLM_PROVIDERS) {
    const key = stored[provider];
    if (!key) continue;
    try {
      await bridge.setApiKey(provider, key);
    } catch {
      /* bridge may be mock or offline; local copy remains */
    }
  }
}

/** Keep keys in localStorage and mirror them to the bridge when possible. */
export function wrapBridgeWithStoredKeys(bridge: InscrivaBridge): InscrivaBridge {
  return {
    ...bridge,
    async setApiKey(provider: string, key: string) {
      if (LLM_PROVIDERS.includes(provider as LlmProviderId)) {
        saveStoredApiKey(provider as LlmProviderId, key);
      }
      await bridge.setApiKey(provider, key);
    },

    async clearApiKey(provider: string) {
      if (LLM_PROVIDERS.includes(provider as LlmProviderId)) {
        clearStoredApiKey(provider as LlmProviderId);
      }
      await bridge.clearApiKey(provider);
    },

    async listProviders() {
      try {
        return mergeProviderStatuses(await bridge.listProviders());
      } catch {
        return mergeProviderStatuses([]);
      }
    },
  };
}
