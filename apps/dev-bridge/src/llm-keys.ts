import fs from "node:fs/promises";
import path from "node:path";

const ENV_KEY_MAP: Record<string, string> = {
  OPENAI_API_KEY: "openai",
  ANTHROPIC_API_KEY: "anthropic",
  GOOGLE_API_KEY: "google",
};

export function llmKeysFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): Record<string, string> {
  const keys: Record<string, string> = {};
  for (const [envName, provider] of Object.entries(ENV_KEY_MAP)) {
    const value = env[envName]?.trim();
    if (value) keys[provider] = value;
  }
  return keys;
}

export async function readLlmKeysFile(
  keysPath: string,
): Promise<Record<string, string>> {
  try {
    const raw = await fs.readFile(keysPath, "utf-8");
    return JSON.parse(raw) as Record<string, string>;
  } catch {
    return {};
  }
}

export async function writeLlmKeysFile(
  keysPath: string,
  keys: Record<string, string>,
): Promise<void> {
  await fs.mkdir(path.dirname(keysPath), { recursive: true });
  await fs.writeFile(keysPath, JSON.stringify(keys, null, 2), "utf-8");
}

export async function setLlmKeyInFile(
  keysPath: string,
  provider: string,
  key: string,
): Promise<void> {
  const keys = await readLlmKeysFile(keysPath);
  keys[provider] = key;
  await writeLlmKeysFile(keysPath, keys);
}

export async function clearLlmKeyInFile(
  keysPath: string,
  provider: string,
): Promise<void> {
  const keys = await readLlmKeysFile(keysPath);
  delete keys[provider];
  await writeLlmKeysFile(keysPath, keys);
}

export async function loadLlmKeys(keysPath: string): Promise<Record<string, string>> {
  const fromFile = await readLlmKeysFile(keysPath);
  return { ...llmKeysFromEnv(), ...fromFile };
}
