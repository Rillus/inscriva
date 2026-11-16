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
        "src/electron-bridge.ts",
        "src/types.ts",
      ],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 70,
        branches: 67,
        functions: 53,
        statements: 70,
      },
    },
  },
});
