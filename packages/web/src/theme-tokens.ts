/**
 * Representative surfaces and token values from app.css.
 * Keep in sync with :root in app.css — theme-contract.test.ts guards contrast.
 */

import { WCAG_AA_NORMAL } from "./contrast.js";

export const SURFACE_PAPER = "#faf6ee";
export const SURFACE_LEATHER_DARK = "#2c1f18";
export const TOPBAR_MID = "#352218";

export const THEME_TOKEN_VALUES: Record<string, string> = {
  "--ink-on-paper": "#1a1510",
  "--ink-on-paper-muted": "#5c5348",
  "--border-on-paper": "#c4b5a3",
  "--surface-tab-active": "#ffffff",
  "--text-on-leather": "#f4ebe3",
  "--text-on-leather-muted": "#c9b8a8",
  "--text-on-leather-subtle": "#b8a898",
  "--text-on-leather-chip": "#2a1810",
  "--text-on-topbar": "#ebe4dc",
  "--text-on-topbar-muted": "#d4ccc4",
  "--text-on-topbar-subtle": "#c4bdb5",
  "--accent-on-leather": "#e8c896",
};

export const THEME_CONTRAST_PAIRS = [
  {
    name: "body text on paper",
    foreground: THEME_TOKEN_VALUES["--ink-on-paper"],
    background: SURFACE_PAPER,
  },
  {
    name: "active workspace tab",
    foreground: THEME_TOKEN_VALUES["--ink-on-paper"],
    background: THEME_TOKEN_VALUES["--surface-tab-active"],
  },
  {
    name: "muted text on paper (scene eyebrows, labels)",
    foreground: THEME_TOKEN_VALUES["--ink-on-paper-muted"],
    background: SURFACE_PAPER,
  },
  {
    name: "context menu on paper",
    foreground: THEME_TOKEN_VALUES["--ink-on-paper"],
    background: SURFACE_PAPER,
  },
  {
    name: "leather rail text",
    foreground: THEME_TOKEN_VALUES["--text-on-leather"],
    background: SURFACE_LEATHER_DARK,
  },
  {
    name: "leather rail muted",
    foreground: THEME_TOKEN_VALUES["--text-on-leather-muted"],
    background: SURFACE_LEATHER_DARK,
  },
  {
    name: "leather rail subtle metadata",
    foreground: THEME_TOKEN_VALUES["--text-on-leather-subtle"],
    background: SURFACE_LEATHER_DARK,
  },
  {
    name: "topbar primary",
    foreground: THEME_TOKEN_VALUES["--text-on-topbar"],
    background: TOPBAR_MID,
  },
  {
    name: "topbar muted status",
    foreground: THEME_TOKEN_VALUES["--text-on-topbar-muted"],
    background: TOPBAR_MID,
  },
  {
    name: "topbar subtle mode pills",
    foreground: THEME_TOKEN_VALUES["--text-on-topbar-subtle"],
    background: TOPBAR_MID,
    minimum: WCAG_AA_NORMAL,
  },
  {
    name: "gold links on topbar",
    foreground: THEME_TOKEN_VALUES["--accent-on-leather"],
    background: TOPBAR_MID,
  },
  {
    name: "active nav chip on leather",
    foreground: THEME_TOKEN_VALUES["--text-on-leather-chip"],
    background: "#e8dfd4",
  },
] as const;
