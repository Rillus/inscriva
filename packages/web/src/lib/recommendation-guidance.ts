import type { LlmTaskId } from "@inscriva/bridge";
import type { Recommendation } from "@inscriva/indexer";

export type RecommendationAction =
  | {
      kind: "assist";
      taskId: LlmTaskId;
      label: string;
      steps: string;
    }
  | {
      kind: "refresh";
      label: string;
      steps: string;
    };

export function resolveRecommendationAction(
  rec: Recommendation,
): RecommendationAction | null {
  switch (rec.suggestedTask) {
    case "review-chapter-goals":
      return {
        kind: "assist",
        taskId: "review-chapter-goals",
        label: "Run AI chapter review",
        steps:
          "Opens the Assist panel with a structured chapter review (outline vs draft, scenes, must-include). Ensure you have an API key in Settings, then click Run in Assist.",
      };
    case "review-continuity":
      return {
        kind: "assist",
        taskId: "review-continuity",
        label: "Review continuity in Assist",
        steps:
          "Opens Assist → Review continuity. Useful for unlinked plants and canon slips.",
      };
    case "review-structure":
      return {
        kind: "assist",
        taskId: "review-structure",
        label: "Review structure in Assist",
        steps: "Opens Assist → Review structure to compare outline scene headings with the draft.",
      };
    case "refresh-checks":
      return {
        kind: "refresh",
        label: "Refresh checks",
        steps: "Re-runs the deterministic checks in this tab (word count, scenes, must-include). No AI tokens.",
      };
    default:
      return null;
  }
}
