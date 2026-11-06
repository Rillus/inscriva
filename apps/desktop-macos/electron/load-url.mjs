import path from "node:path";
import { pathToFileURL } from "node:url";

/** Vite port shared with Tauri beforeDevCommand / tauri.conf.json devUrl. */
export const DEV_URL = "http://localhost:5173";

/** Window chrome matching the existing Tauri shell. */
export const WINDOW_DEFAULTS = Object.freeze({
  title: "Inscriva",
  width: 1280,
  height: 860,
  resizable: true,
});

/**
 * @param {{ isPackaged: boolean, env?: NodeJS.ProcessEnv }} opts
 * @returns {boolean}
 */
export function isDevMode({ isPackaged, env = process.env }) {
  if (env.ELECTRON_DEV === "1") return true;
  if (env.ELECTRON_DEV === "0") return false;
  return !isPackaged;
}

/**
 * @param {{ isDev: boolean, webDistDir: string }} opts
 * @returns {string}
 */
export function resolveLoadURL({ isDev, webDistDir }) {
  if (isDev) return DEV_URL;
  return pathToFileURL(path.join(webDistDir, "index.html")).href;
}

/**
 * @param {{ preloadPath: string }} opts
 */
export function browserWindowOptions({ preloadPath }) {
  return {
    ...WINDOW_DEFAULTS,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  };
}
