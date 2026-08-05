import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "packages/web/dist");
const destination = path.join(root, "dist");

async function main() {
  try {
    await fs.access(source);
  } catch {
    throw new Error(
      `Expected web build output at ${source}. Run pnpm --filter @inscriva/web build first.`,
    );
  }

  await fs.rm(destination, { recursive: true, force: true });
  await fs.cp(source, destination, { recursive: true });
  console.log(`Staged Vercel output: ${source} → ${destination}`);
}

await main();
