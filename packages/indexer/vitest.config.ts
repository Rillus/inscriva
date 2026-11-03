import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/index.ts"],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 91,
        branches: 79,
        functions: 91,
        statements: 91,
      },
    },
  },
});
