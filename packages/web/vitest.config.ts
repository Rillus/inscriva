import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    setupFiles: ["./vitest.setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: [
        "src/lib/**/*.test.ts",
        "src/lib/tauri-bridge-stub.ts",
        "src/lib/codemirror-extensions.ts",
        "src/lib/mock-book.ts",
        "src/main.ts",
      ],
      reporter: ["text", "text-summary"],
      thresholds: {
        lines: 51,
        branches: 46,
        functions: 58,
        statements: 49,
      },
    },
  },
});
