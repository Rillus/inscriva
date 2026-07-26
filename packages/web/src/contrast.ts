/** WCAG 2.x relative luminance and contrast helpers for theme tokens. */

export function parseHex(hex: string): [number, number, number] {
  const normalised = hex.replace(/^#/, "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalised)) {
    throw new Error(`Expected #rrggbb, got ${hex}`);
  }
  const r = parseInt(normalised.slice(0, 2), 16);
  const g = parseInt(normalised.slice(2, 4), 16);
  const b = parseInt(normalised.slice(4, 6), 16);
  return [r, g, b];
}

function channelLuminance(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  return (
    0.2126 * channelLuminance(r) +
    0.7152 * channelLuminance(g) +
    0.0722 * channelLuminance(b)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = relativeLuminance(foreground);
  const bg = relativeLuminance(background);
  const lighter = Math.max(fg, bg);
  const darker = Math.min(fg, bg);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Blends opaque foreground over background (alpha compositing). */
export function blendOver(
  foreground: string,
  background: string,
  alpha: number,
): string {
  const [fr, fg, fb] = parseHex(foreground);
  const [br, bgc, bb] = parseHex(background);
  const mix = (f: number, b: number) =>
    Math.round(f * alpha + b * (1 - alpha));
  const r = mix(fr, br);
  const g = mix(fg, bgc);
  const b = mix(fb, bb);
  return `#${[r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

export const WCAG_AA_NORMAL = 4.5;
export const WCAG_AA_LARGE = 3;

export interface ContrastPair {
  name: string;
  foreground: string;
  background: string;
  minimum?: number;
}
