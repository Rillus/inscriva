import { describe, expect, it } from "vitest";
import { buildContext } from "./context.js";

const CANON = new Map([
  [
    "00 Canon/Style Guide.md",
    "# Style Guide\n\nUse close third person. Avoid adverbs.",
  ],
  [
    "00 Canon/Character Bible.md",
    "# Character Bible\n\nMara — captain, dry humour.",
  ],
  [
    "00 Canon/Continuity Log.md",
    "# Continuity Log\n\nCh01: The lighthouse was dark on arrival.",
  ],
  [
    "01 Outlines/Chapter Outlines/Ch01 - Opening.md",
    "# Ch01 Outline\n\n## Scene 1\nMara reaches the harbour at dawn.",
  ],
  [
    "02 Drafts/Chapters/Ch01 - Opening.md",
    "# Ch01\n\nThe harbour smelled of rope and rain.",
  ],
]);

describe("buildContext", () => {
  it("includes canon sections and chapter outline for draft-scene", () => {
    const ctx = buildContext({
      taskId: "draft-scene",
      bookFiles: CANON,
      chapterKey: "Ch01",
    });

    expect(ctx.sections.map((s) => s.label)).toEqual(
      expect.arrayContaining(["Style Guide", "Character Bible", "Continuity Log", "Chapter outline"]),
    );
    expect(ctx.user).toContain("Mara reaches the harbour");
    expect(ctx.system).toContain("draft-scene");
  });

  it("includes selection text when provided", () => {
    const ctx = buildContext({
      taskId: "fix-paragraph",
      bookFiles: CANON,
      chapterKey: "Ch01",
      selectionText: "The harbour smelled of rope.",
    });

    expect(ctx.user).toContain("The harbour smelled of rope");
  });

  it("trims low-priority sections when over char budget", () => {
    const huge = new Map(CANON);
    huge.set(
      "00 Canon/Character Bible.md",
      "# Character Bible\n\n" + "x".repeat(20_000),
    );

    const ctx = buildContext({
      taskId: "review-continuity",
      bookFiles: huge,
      chapterKey: "Ch01",
      maxChars: 120,
    });

    expect(ctx.sections.find((s) => s.label === "Continuity Log")?.included).toBe(true);
    expect(ctx.sections.find((s) => s.label === "Character Bible")?.included).toBe(
      false,
    );
  });

  it("includes chapter focus and relevant canon when provided", () => {
    const ctx = buildContext({
      taskId: "draft-scene",
      bookFiles: CANON,
      chapterKey: "Ch01",
      chapterFocus: "**Current scene:** Breakfast\n**Story question:** Will Mara speak?",
      relevantCanon: "**Mara**\nCaptain with dry humour.",
    });

    expect(ctx.user).toContain("Current scene");
    expect(ctx.user).toContain("Captain with dry humour");
    expect(ctx.sections.map((s) => s.label)).toEqual(
      expect.arrayContaining(["Chapter focus", "Relevant canon"]),
    );
  });

  it("includes draft excerpt and author note when provided", () => {
    const ctx = buildContext({
      taskId: "brainstorm",
      bookFiles: CANON,
      chapterKey: "Ch01",
      draftExcerpt: "Rain on the quay.",
      userMessage: "Keep the tone dry.",
    });

    expect(ctx.user).toContain("Rain on the quay");
    expect(ctx.user).toContain("Keep the tone dry");
  });
});
