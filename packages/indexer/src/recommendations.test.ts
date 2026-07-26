import { describe, expect, it } from "vitest";
import { evaluateRecommendations } from "./recommendations.js";

describe("evaluateRecommendations", () => {
  it("suggests word-target-near when draft is within 90–110%", () => {
    const recs = evaluateRecommendations({
      chapterKey: "Ch01",
      draftWords: 3000,
      wordTarget: { min: 3000, max: 3000 },
      alignmentSummary: "ok",
    });
    expect(recs.some((r) => r.id === "word-target-near")).toBe(true);
  });

  it("suggests alignment-stale when summary is stale", () => {
    const recs = evaluateRecommendations({
      chapterKey: "Ch01",
      draftWords: 100,
      alignmentSummary: "stale",
    });
    expect(recs.some((r) => r.id === "alignment-stale")).toBe(true);
  });

  it("suggests unlinked-plants when plants remain", () => {
    const recs = evaluateRecommendations({
      chapterKey: "Ch01",
      draftWords: 100,
      unlinkedPlants: ["P03"],
    });
    expect(recs.some((r) => r.id === "unlinked-plants")).toBe(true);
  });

  it("suppresses alignment-warnings when outline status is Approved", () => {
    const recs = evaluateRecommendations({
      chapterKey: "Ch01",
      draftWords: 1450,
      alignmentSummary: "warnings",
      outlineStatus: "Approved",
    });
    expect(recs.some((r) => r.id === "alignment-warnings")).toBe(false);
  });

  it("suggests alignment-warnings when checks fail and chapter is not complete", () => {
    const recs = evaluateRecommendations({
      chapterKey: "Ch01",
      draftWords: 1450,
      alignmentSummary: "warnings",
    });
    expect(recs.some((r) => r.id === "alignment-warnings")).toBe(true);
  });
});
