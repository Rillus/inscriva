import type { Host, InscrivaBridge } from "./types.js";

declare global {
  interface Window {
    inscrivaBridge?: InscrivaBridge;
  }
}

export function detectHost(): Host {
  if (typeof window !== "undefined" && window.inscrivaBridge) {
    return "bridge";
  }
  return "browser";
}

export function getBridge(): InscrivaBridge | null {
  if (typeof window !== "undefined" && window.inscrivaBridge) {
    return window.inscrivaBridge;
  }
  return null;
}

export function installBridge(bridge: InscrivaBridge): void {
  if (typeof window !== "undefined") {
    window.inscrivaBridge = bridge;
  }
}
