#!/usr/bin/env node
/**
 * Renders inscriva-mark-icon.svg to PNG with transparency (macOS app icon source).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Resvg } from "@resvg/resvg-js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const svgPath = join(root, "inscriva-mark-icon.svg");
const iconPng = join(root, "apps/desktop-macos/src-tauri/icons/icon.png");
const publicDir = join(root, "packages/web/public");

const SIZE = 1024;

const svg = readFileSync(svgPath, "utf8");
const resvg = new Resvg(svg, {
  fitTo: { mode: "width", value: SIZE },
  background: "transparent",
});
const png = resvg.render().asPng();
writeFileSync(iconPng, png);

const faviconSvg = readFileSync(svgPath, "utf8");
writeFileSync(join(publicDir, "favicon.svg"), faviconSvg);
writeFileSync(join(publicDir, "inscriva-mark-icon.svg"), faviconSvg);

console.log(`Wrote ${iconPng} (${SIZE}×${SIZE}, transparent)`);
console.log(`Synced square mark to packages/web/public/`);
