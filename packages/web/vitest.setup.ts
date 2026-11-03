import { Window } from "happy-dom";

/**
 * Node 22+ may define a global `localStorage` that is not a full Storage implementation.
 * Vitest's happy-dom environment does not always replace it, which breaks setItem/clear in tests.
 */
function installDomStorage(): void {
  const probe = "__inscriva_vitest_storage_probe__";
  try {
    globalThis.localStorage.setItem(probe, "1");
    globalThis.localStorage.removeItem(probe);
    return;
  } catch {
    // fall through
  }

  const window = new Window({ url: "https://localhost/" });
  Object.defineProperty(globalThis, "localStorage", {
    value: window.localStorage,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis, "sessionStorage", {
    value: window.sessionStorage,
    configurable: true,
    writable: true,
  });
}

installDomStorage();
