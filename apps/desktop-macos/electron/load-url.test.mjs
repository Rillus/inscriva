import path from "node:path";
import { pathToFileURL } from "node:url";
import { describe, expect, it } from "vitest";
import {
  DEV_URL,
  WINDOW_DEFAULTS,
  browserWindowOptions,
  isDevMode,
  resolveLoadURL,
} from "./load-url.mjs";

describe("isDevMode", () => {
  it("honours ELECTRON_DEV=1 even when packaged", () => {
    expect(isDevMode({ isPackaged: true, env: { ELECTRON_DEV: "1" } })).toBe(
      true,
    );
  });

  it("honours ELECTRON_DEV=0 even when unpackaged", () => {
    expect(isDevMode({ isPackaged: false, env: { ELECTRON_DEV: "0" } })).toBe(
      false,
    );
  });

  it("defaults to unpackaged = dev", () => {
    expect(isDevMode({ isPackaged: false, env: {} })).toBe(true);
    expect(isDevMode({ isPackaged: true, env: {} })).toBe(false);
  });
});

describe("resolveLoadURL", () => {
  it("loads the Vite URL in dev", () => {
    expect(
      resolveLoadURL({ isDev: true, webDistDir: "/tmp/does-not-matter" }),
    ).toBe(DEV_URL);
  });

  it("loads packages/web/dist/index.html as a file URL in prod", () => {
    const webDistDir = path.join("/repo", "packages", "web", "dist");
    expect(resolveLoadURL({ isDev: false, webDistDir })).toBe(
      pathToFileURL(path.join(webDistDir, "index.html")).href,
    );
  });
});

describe("browserWindowOptions", () => {
  it("matches Tauri window chrome and locks down the renderer", () => {
    const opts = browserWindowOptions({ preloadPath: "/x/preload.cjs" });
    expect(opts.title).toBe(WINDOW_DEFAULTS.title);
    expect(opts.width).toBe(1280);
    expect(opts.height).toBe(860);
    expect(opts.resizable).toBe(true);
    expect(opts.webPreferences).toEqual({
      preload: "/x/preload.cjs",
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    });
  });
});
