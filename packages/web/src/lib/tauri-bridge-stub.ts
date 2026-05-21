import type { InscrivaBridge } from "@inscriva/bridge";

/** Used when the Vite dev server runs without the Tauri shell. */
export function createTauriBridge(): InscrivaBridge | null {
  return null;
}

export async function bindTauriMenu(
  _handler: (action: string) => void,
): Promise<() => void> {
  return () => {};
}

export async function onGithubConnected(
  _handler: (username: string) => void,
): Promise<() => void> {
  return () => {};
}
