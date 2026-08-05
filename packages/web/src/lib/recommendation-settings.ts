import type { Recommendation, RecommendationId } from "@inscriva/indexer";

const STORAGE_KEY = "inscriva.recommendations";

export interface RecommendationSettings {
  enabled: boolean;
  disabledRuleIds: RecommendationId[];
}

export const DEFAULT_RECOMMENDATION_SETTINGS: RecommendationSettings = {
  enabled: true,
  disabledRuleIds: [],
};

export function loadRecommendationSettings(): RecommendationSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_RECOMMENDATION_SETTINGS;
    const data = JSON.parse(raw) as Partial<RecommendationSettings>;
    return {
      enabled: data.enabled ?? true,
      disabledRuleIds: Array.isArray(data.disabledRuleIds)
        ? data.disabledRuleIds
        : [],
    };
  } catch {
    return DEFAULT_RECOMMENDATION_SETTINGS;
  }
}

export function saveRecommendationSettings(settings: RecommendationSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function filterRecommendations(
  recs: Recommendation[],
  settings: RecommendationSettings,
): Recommendation[] {
  if (!settings.enabled) return [];
  const disabled = new Set(settings.disabledRuleIds);
  return recs.filter((rec) => !disabled.has(rec.id));
}
