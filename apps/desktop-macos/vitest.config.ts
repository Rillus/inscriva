import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["electron/**/*.test.mjs"],
    coverage: {
      provider: "v8",
      include: [
        "electron/load-url.mjs",
        "electron/book-fs.mjs",
        "electron/llm-keys.mjs",
        "electron/llm-proxy.mjs",
        "electron/book-files-map.mjs",
      ],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 90,
        branches: 80,
        functions: 90,
        statements: 90,
      },
    },
  },
});
