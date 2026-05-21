import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  loadLlmKeys,
  llmKeysFromEnv,
  readLlmKeysFile,
  setLlmKeyInFile,
} from "./llm-keys.js";

describe("llmKeysFromEnv", () => {
  it("maps provider env vars to bridge provider ids", () => {
    expect(
      llmKeysFromEnv({
        OPENAI_API_KEY: "sk-test",
        ANTHROPIC_API_KEY: "ant-test",
      }),
    ).toEqual({
      openai: "sk-test",
      anthropic: "ant-test",
    });
  });

  it("ignores empty env values", () => {
    expect(llmKeysFromEnv({ OPENAI_API_KEY: "  " })).toEqual({});
  });
});

describe("setLlmKeyInFile", () => {
  it("persists keys to disk across reloads", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "inscriva-keys-"));
    const keysPath = path.join(dir, "keys.json");
    await setLlmKeyInFile(keysPath, "google", "gemini-secret");
    expect(await readLlmKeysFile(keysPath)).toEqual({ google: "gemini-secret" });
    expect((await loadLlmKeys(keysPath)).google).toBe("gemini-secret");
    await fs.rm(dir, { recursive: true, force: true });
  });
});
