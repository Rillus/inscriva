import type { BridgeCapabilities, InscrivaBridge } from "@inscriva/bridge";

export function preferredWelcomeTab(
  capabilities: BridgeCapabilities,
): "open" | "git" | "new" {
  if (capabilities.platform === "android" && !capabilities.folderPicker) {
    return "git";
  }
  return "open";
}

export async function resolveCloneParentPath(
  bridge: InscrivaBridge,
  current: string,
): Promise<string> {
  const trimmed = current.trim();
  if (trimmed) return trimmed;
  if (bridge.getBooksLibraryPath) {
    const path = await bridge.getBooksLibraryPath();
    if (path) return path;
  }
  return "";
}
