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
        lines: 53,
        branches: 38,
        functions: 62,
        statements: 53,
      },
    },
  },
});
