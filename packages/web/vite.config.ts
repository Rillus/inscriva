import path from "node:path";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

const isTauriDev = Boolean(
  process.env.TAURI_ENV_PLATFORM ??
    process.env.TAURI_ARCH ??
    process.env.TAURI_ENV_DEBUG ??
    process.env.VITE_TAURI_DEV,
);

/** Real bridge in Tauri dev/build; stub when running Vite alone in the browser. */
const tauriBridgeEntry = isTauriDev
  ? path.resolve(__dirname, "../bridge/src/tauri-bridge.ts")
  : path.resolve(__dirname, "src/lib/tauri-bridge-stub.ts");

export default defineConfig({
  plugins: [svelte()],
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    rollupOptions: {
      external: (id) =>
        !isTauriDev &&
        (id.includes("tauri-bridge") || id.startsWith("@tauri-apps")),
    },
  },
  optimizeDeps: {
    exclude: isTauriDev ? [] : ["@inscriva/bridge/tauri-bridge"],
  },
  resolve: {
    alias: {
      "@inscriva/bridge/tauri-bridge": tauriBridgeEntry,
      "@inscriva/bridge": path.resolve(__dirname, "../bridge/src/index.ts"),
      "@inscriva/indexer": path.resolve(__dirname, "../indexer/src/index.ts"),
    },
  },
  server: {
    port: 5173,
  },
});
