import type { BridgeCapabilities, InscrivaBridge } from "./types.js";

export function capabilitiesFromBridge(
  bridge: InscrivaBridge,
): BridgeCapabilities {
  return {
    folderPicker: typeof bridge.pickBookFolder === "function",
    gitClone: typeof bridge.gitClone === "function",
    gitPull: typeof bridge.gitPull === "function",
    gitInspect: typeof bridge.gitInspect === "function",
    gitOAuth: typeof bridge.gitOAuthStart === "function",
  };
}
