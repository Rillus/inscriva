import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/server.ts"],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 54,
        branches: 75,
        functions: 62,
        statements: 54,
      },
    },
  },
});
