import { describe, expect, it } from "vitest";
import {
  appendSceneLedgerEntries,
  extractDraftSceneHeadings,
  formatSceneLedgerEntry,
  SCENE_LEDGER_PATH,
} from "./scene-ledger.js";

describe("scene-ledger", () => {
  const draft = `# The Eighth A

## Scene 1 — Breakfast table

Mara set down her cup.

## Scene 2 — Tide and rope

She heard the rope.`;

  it("exports canonical path", () => {
    expect(SCENE_LEDGER_PATH).toBe("03 Revision/Scene Ledger.md");
  });

  it("extracts scene headings from draft markdown", () => {
    expect(extractDraftSceneHeadings(draft)).toEqual([
      "Scene 1 — Breakfast table",
      "Scene 2 — Tide and rope",
    ]);
  });

  it("formats a ledger line", () => {
    expect(
      formatSceneLedgerEntry({
        chapterKey: "Ch01",
        sceneLabel: "Scene 1 — Breakfast table",
      }),
    ).toContain("Ch01");
    expect(
      formatSceneLedgerEntry({
        chapterKey: "Ch01",
        sceneLabel: "Scene 1 — Breakfast table",
      }),
    ).toContain("Breakfast table");
  });

  it("appends new entries without duplicating", () => {
    const existing = `# Scene Ledger

- Ch01 · Scene 1 — Breakfast table
`;
    const next = appendSceneLedgerEntries(existing, "Ch01", [
      "Scene 1 — Breakfast table",
      "Scene 2 — Tide and rope",
    ]);
    expect(next).toContain("Scene 2 — Tide and rope");
    expect(next.match(/Scene 1 — Breakfast table/g)?.length).toBe(1);
  });
});
