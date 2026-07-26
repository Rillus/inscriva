import { isChapterWorkflowComplete } from "./workflow-status.js";
import { wordsWithinTargetBand, type WordTarget } from "./word-target.js";

export type RecommendationId =
  | "word-target-near"
  | "word-target-over"
  | "unlinked-plants"
  | "alignment-stale"
  | "alignment-warnings";

export interface Recommendation {
  id: RecommendationId;
  message: string;
  suggestedTask?: string;
}

export interface RecommendationContext {
  chapterKey: string;
  draftWords: number;
  wordTarget?: WordTarget | null;
  unlinkedPlants?: string[];
  alignmentSummary?: "ok" | "warnings" | "stale";
  outlineStatus?: string;
  /** When true, suppress nags to run AI review / refresh for checklist gaps. */
  workflowComplete?: boolean;
}

export function evaluateRecommendations(
  ctx: RecommendationContext,
): Recommendation[] {
  const recs: Recommendation[] = [];

  const workflowComplete =
    ctx.workflowComplete ?? isChapterWorkflowComplete(ctx.outlineStatus);

  if (ctx.wordTarget && !workflowComplete) {
    if (wordsWithinTargetBand(ctx.draftWords, ctx.wordTarget)) {
      recs.push({
        id: "word-target-near",
        message: "Draft is within 90–110% of the outline word target.",
        suggestedTask: "review-chapter-goals",
      });
    } else if (ctx.draftWords > ctx.wordTarget.max * 1.1) {
      recs.push({
        id: "word-target-over",
        message: "Draft exceeds the outline word target band.",
        suggestedTask: "refresh-checks",
      });
    }
  }

  if (ctx.unlinkedPlants?.length && !workflowComplete) {
    recs.push({
      id: "unlinked-plants",
      message: `Plants not in draft: ${ctx.unlinkedPlants.join(", ")}`,
      suggestedTask: "review-continuity",
    });
  }

  if (ctx.alignmentSummary === "stale") {
    recs.push({
      id: "alignment-stale",
      message: "Draft or outline changed since the last alignment check.",
      suggestedTask: "refresh-checks",
    });
  } else if (ctx.alignmentSummary === "warnings" && !workflowComplete) {
    recs.push({
      id: "alignment-warnings",
      message:
        "Some outline goals are not met yet (see checks below). An AI chapter review gives a structured assessment.",
      suggestedTask: "review-chapter-goals",
    });
  }

  return recs;
}
