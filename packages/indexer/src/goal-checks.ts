export type GoalChecksByChapter = Record<
  string,
  Record<string, boolean>
>;

export function parseGoalChecks(raw: string): GoalChecksByChapter {
  try {
    const data = JSON.parse(raw) as GoalChecksByChapter;
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

export function serialiseGoalChecks(checks: GoalChecksByChapter): string {
  return `${JSON.stringify(checks, null, 2)}\n`;
}

export function toggleGoalCheck(
  checks: GoalChecksByChapter,
  chapterKey: string,
  item: string,
  checked: boolean,
): GoalChecksByChapter {
  const chapter = { ...(checks[chapterKey] ?? {}), [item]: checked };
  return { ...checks, [chapterKey]: chapter };
}

export function isGoalChecked(
  checks: GoalChecksByChapter,
  chapterKey: string,
  item: string,
  heuristicHit: boolean,
): boolean {
  const manual = checks[chapterKey]?.[item];
  if (manual !== undefined) return manual;
  return heuristicHit;
}
