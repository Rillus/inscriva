import { describe, expect, it } from "vitest";
import { resolveRecommendationAction } from "./recommendation-guidance.js";

describe("resolveRecommendationAction", () => {
  it("maps alignment warnings to review-chapter-goals in Assist", () => {
    const action = resolveRecommendationAction({
      id: "alignment-warnings",
      message: "Alignment report has warnings",
      suggestedTask: "review-chapter-goals",
    });
    expect(action?.kind).toBe("assist");
    if (action?.kind === "assist") {
      expect(action.taskId).toBe("review-chapter-goals");
      expect(action.label).toMatch(/chapter review/i);
      expect(action.steps).toMatch(/Assist/i);
    }
  });

  it("maps refresh-checks to a refresh action", () => {
    const action = resolveRecommendationAction({
      id: "alignment-stale",
      message: "Stale",
      suggestedTask: "refresh-checks",
    });
    expect(action?.kind).toBe("refresh");
    if (action?.kind === "refresh") {
      expect(action.label).toBe("Refresh checks");
      expect(action.steps).toMatch(/deterministic/i);
    }
  });
});
