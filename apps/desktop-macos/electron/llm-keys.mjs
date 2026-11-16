import fs from "node:fs";
import path from "node:path";

/** Same order as dev-bridge and mock-bridge (web UI unchanged). */
export const LLM_KEY_PROVIDERS = ["openai", "anthropic", "google", "custom"];

/**
 * @param {string} provider
 */
function assertKnownProvider(provider) {
  if (!LLM_KEY_PROVIDERS.includes(provider)) {
    throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * @param {string} keysPath
 * @returns {Record<string, string>}
 */
function readStore(keysPath) {
  try {
    const raw = fs.readFileSync(keysPath, "utf8");
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {};
    }
    /** @type {Record<string, string>} */
    const out = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (typeof v === "string") {
        out[k] = v;
      }
    }
    return out;
  } catch {
    /* missing or corrupt file: treat as empty */
    return {};
  }
}

/**
 * @param {string} keysPath
 * @param {Record<string, string>} data
 */
function writeStore(keysPath, data) {
  fs.mkdirSync(path.dirname(keysPath), { recursive: true });
  fs.writeFileSync(keysPath, JSON.stringify(data), { mode: 0o600 });
  // `mode` only applies on create; tighten a pre-existing file too.
  fs.chmodSync(keysPath, 0o600);
}

/**
 * @typedef {object} LlmKeyStoreDeps
 * @property {{ encryptString: (s: string) => Buffer, decryptString: (b: Buffer) => string, isEncryptionAvailable: () => boolean }} safeStorage
 * @property {string} keysPath
 */

/**
 * Encrypted LLM API key store (main-process only decryption via getKey).
 * @param {LlmKeyStoreDeps} deps
 */
export function createLlmKeyStore({ safeStorage, keysPath }) {
  return {
    /**
     * @param {string} provider
     * @param {string} key
     */
    setKey(provider, key) {
      assertKnownProvider(provider);
      if (typeof key !== "string" || !key.trim()) {
        throw new Error("API key must be a non-empty string");
      }
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error("Encryption is not available on this system");
      }
      const trimmed = key.trim();
      const encrypted = safeStorage.encryptString(trimmed);
      const store = readStore(keysPath);
      store[provider] = encrypted.toString("base64");
      writeStore(keysPath, store);
    },

    /**
     * @param {string} provider
     */
    clearKey(provider) {
      assertKnownProvider(provider);
      const store = readStore(keysPath);
      if (!(provider in store)) {
        return;
      }
      delete store[provider];
      writeStore(keysPath, store);
    },

    /**
     * @returns {{ provider: string, configured: boolean }[]}
     */
    listProviders() {
      const store = readStore(keysPath);
      return LLM_KEY_PROVIDERS.map((provider) => ({
        provider,
        configured: Boolean(store[provider]),
      }));
    },

    /**
     * @param {string} provider
     * @returns {string | null}
     */
    getKey(provider) {
      assertKnownProvider(provider);
      const store = readStore(keysPath);
      const encoded = store[provider];
      if (!encoded) {
        return null;
      }
      if (!safeStorage.isEncryptionAvailable()) {
        return null;
      }
      try {
        const buf = Buffer.from(encoded, "base64");
        return safeStorage.decryptString(buf);
      } catch {
        return null;
      }
    },
  };
}