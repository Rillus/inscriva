import { describe, expect, it, beforeEach } from "vitest";
import {
  DEFAULT_RECOMMENDATION_SETTINGS,
  filterRecommendations,
  loadRecommendationSettings,
  saveRecommendationSettings,
} from "./recommendation-settings.js";
import type { Recommendation } from "@inscriva/indexer";

describe("recommendation-settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads defaults when nothing stored", () => {
    expect(loadRecommendationSettings()).toEqual(DEFAULT_RECOMMENDATION_SETTINGS);
  });

  it("persists disabled rule ids", () => {
    saveRecommendationSettings({
      ...DEFAULT_RECOMMENDATION_SETTINGS,
      disabledRuleIds: ["word-target-near"],
    });
    expect(loadRecommendationSettings().disabledRuleIds).toContain(
      "word-target-near",
    );
  });

  it("filters recommendations by settings", () => {
    const recs: Recommendation[] = [
      { id: "word-target-near", message: "Near target" },
      { id: "alignment-stale", message: "Stale" },
    ];
    const filtered = filterRecommendations(recs, {
      enabled: true,
      disabledRuleIds: ["word-target-near"],
    });
    expect(filtered.map((r) => r.id)).toEqual(["alignment-stale"]);
  });
});
