import { app, BrowserWindow } from "electron";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  browserWindowOptions,
  isDevMode,
  resolveLoadURL,
} from "./load-url.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function webDistDir() {
  return path.resolve(__dirname, "../../../packages/web/dist");
}

function createWindow() {
  const preloadPath = path.join(__dirname, "preload.cjs");
  const win = new BrowserWindow(browserWindowOptions({ preloadPath }));
  const isDev = isDevMode({ isPackaged: app.isPackaged });
  const url = resolveLoadURL({ isDev, webDistDir: webDistDir() });
  win.loadURL(url);
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
