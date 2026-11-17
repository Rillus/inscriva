import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const entry = path.resolve(__dirname, "../../../packages/llm/src/index.ts");
const outfile = path.join(__dirname, "llm-bundle.mjs");

const esbuild = await import("esbuild");

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  platform: "node",
  format: "esm",
  outfile,
  logLevel: "info",
});