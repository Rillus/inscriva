import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createLlmKeyStore,
  LLM_KEY_PROVIDERS,
} from "./llm-keys.mjs";

/**
 * @param {boolean} available
 */
function fakeSafeStorage(available = true) {
  return {
    isEncryptionAvailable: () => available,
    encryptString: (s) => Buffer.from(`enc:${s}`, "utf8"),
    decryptString: (buf) => {
      const s = buf.toString("utf8");
      if (!s.startsWith("enc:")) {
        throw new Error("bad cipher");
      }
      return s.slice(4);
    },
  };
}

describe("llm-keys", () => {
  /** @type {string} */
  let tmp;
  /** @type {string} */
  let keysPath;
  /** @type {ReturnType<typeof createLlmKeyStore>} */
  let store;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "inscriva-llm-keys-"));
    keysPath = path.join(tmp, "nested", "llm-keys.json");
    store = createLlmKeyStore({
      safeStorage: fakeSafeStorage(),
      keysPath,
    });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("lists all providers in order with configured flags", () => {
    expect(store.listProviders()).toEqual(
      LLM_KEY_PROVIDERS.map((provider) => ({ provider, configured: false })),
    );
  });

  it("set then list shows configured only for that provider", () => {
    store.setKey("openai", "  sk-secret  ");
    const list = store.listProviders();
    expect(list.find((p) => p.provider === "openai")?.configured).toBe(true);
    expect(list.filter((p) => p.configured)).toHaveLength(1);
  });

  it("does not persist plaintext key material on disk", () => {
    store.setKey("anthropic", "ant-plaintext-key");
    const onDisk = fs.readFileSync(keysPath, "utf8");
    expect(onDisk).not.toContain("ant-plaintext-key");
    expect(onDisk).toContain("anthropic");
  });

  it("getKey round-trips trimmed value", () => {
    store.setKey("google", "  gemini-key  ");
    expect(store.getKey("google")).toBe("gemini-key");
  });

  it("clearKey removes configured status", () => {
    store.setKey("custom", "my-key");
    store.clearKey("custom");
    expect(store.listProviders().find((p) => p.provider === "custom")?.configured).toBe(
      false,
    );
    expect(store.getKey("custom")).toBeNull();
  });

  it("clearKey on missing provider is a no-op", () => {
    expect(() => store.clearKey("openai")).not.toThrow();
  });

  it("rejects unknown provider on set and clear", () => {
    expect(() => store.setKey("unknown", "x")).toThrow(/Unknown provider/);
    expect(() => store.clearKey("unknown")).toThrow(/Unknown provider/);
  });

  it("rejects empty or whitespace-only key", () => {
    expect(() => store.setKey("openai", "")).toThrow(/non-empty/);
    expect(() => store.setKey("openai", "   ")).toThrow(/non-empty/);
    expect(() => store.setKey("openai", 123)).toThrow(/non-empty/);
  });

  it("throws when encryption unavailable and writes nothing", () => {
    const noEncStore = createLlmKeyStore({
      safeStorage: fakeSafeStorage(false),
      keysPath,
    });
    expect(() => noEncStore.setKey("openai", "sk-x")).toThrow(/Encryption is not available/);
    expect(fs.existsSync(keysPath)).toBe(false);
  });

  it("treats corrupt keys file as empty", () => {
    fs.mkdirSync(path.dirname(keysPath), { recursive: true });
    fs.writeFileSync(keysPath, "not-json{{{");
    expect(store.listProviders().every((p) => !p.configured)).toBe(true);
  });

  it("listProviders output contains no key material", () => {
    store.setKey("openai", "super-secret-sk");
    const serialised = JSON.stringify(store.listProviders());
    expect(serialised).not.toContain("super-secret");
    expect(serialised).not.toContain("sk-");
  });

  it.skipIf(process.platform === "win32")(
    "writes keys file with mode 0o600",
    () => {
      store.setKey("openai", "sk-x");
      const mode = fs.statSync(keysPath).mode & 0o777;
      expect(mode).toBe(0o600);
    },
  );

  it.skipIf(process.platform === "win32")(
    "tightens a pre-existing keys file to mode 0o600",
    () => {
      fs.mkdirSync(path.dirname(keysPath), { recursive: true });
      fs.writeFileSync(keysPath, "{}", { mode: 0o644 });
      store.setKey("openai", "sk-x");
      const mode = fs.statSync(keysPath).mode & 0o777;
      expect(mode).toBe(0o600);
    },
  );

  it("getKey returns null when the stored value cannot be decrypted", () => {
    fs.mkdirSync(path.dirname(keysPath), { recursive: true });
    fs.writeFileSync(
      keysPath,
      JSON.stringify({ openai: Buffer.from("garbage").toString("base64") }),
    );
    expect(store.getKey("openai")).toBeNull();
  });
});