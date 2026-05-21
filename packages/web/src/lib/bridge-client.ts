import {
  capabilitiesFromBridge,
  createHttpBridge,
  createMockBridge,
  installBridge,
  type BridgeCapabilities,
  type InscrivaBridge,
  type Host,
} from "@inscriva/bridge";
import { createMockBook } from "./mock-book.js";
import {
  syncStoredKeysToBridge,
  wrapBridgeWithStoredKeys,
} from "./stored-api-keys.js";

const DEV_BRIDGE_URL =
  import.meta.env.VITE_BRIDGE_URL ?? "http://127.0.0.1:3847";

function isTauri(): boolean {
  return (
    typeof window !== "undefined" &&
    ("__TAURI_INTERNALS__" in window || "__TAURI__" in window)
  );
}

async function tryTauriBridge(): Promise<InscrivaBridge | null> {
  if (!isTauri()) return null;
  try {
    const { createTauriBridge } = await import("@inscriva/bridge/tauri-bridge");
    return createTauriBridge();
  } catch {
    return null;
  }
}

export async function resolveBridge(options?: {
  demo?: boolean;
}): Promise<{ bridge: InscrivaBridge; host: Host }> {
  const finish = async (bridge: InscrivaBridge, host: Host) => {
    const wrapped = wrapBridgeWithStoredKeys(bridge);
    await syncStoredKeysToBridge(wrapped);
    installBridge(wrapped);
    return { bridge: wrapped, host };
  };

  if (typeof window !== "undefined" && window.inscrivaBridge) {
    return finish(window.inscrivaBridge, "bridge");
  }

  const tauri = await tryTauriBridge();
  if (tauri) {
    return finish(tauri, "bridge");
  }

  if (!options?.demo) {
    try {
      const res = await fetch(`${DEV_BRIDGE_URL}/health`, {
        signal: AbortSignal.timeout(800),
      });
      if (res.ok) {
        return finish(createHttpBridge(DEV_BRIDGE_URL), "bridge");
      }
    } catch {
      /* dev bridge offline */
    }
  }

  const mock = createMockBook();
  return finish(createMockBridge(mock), options?.demo ? "browser" : "bridge");
}

export async function loadCapabilities(
  bridge: InscrivaBridge,
): Promise<BridgeCapabilities> {
  if (bridge.getCapabilities) {
    return bridge.getCapabilities();
  }
  return capabilitiesFromBridge(bridge);
}

export function fixtureBookPath(): string {
  return import.meta.env.VITE_FIXTURE_BOOK ?? "";
}
