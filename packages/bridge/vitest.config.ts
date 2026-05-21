import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: [
        "src/**/*.test.ts",
        "src/**/index.ts",
        "src/tauri-bridge.ts",
        "src/types.ts",
      ],
      reporter: ["text", "text-summary"],
    },
  },
});
