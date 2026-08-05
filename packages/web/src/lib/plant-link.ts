export function insertPlantReference(
  content: string,
  caret: number,
  plantId: string,
): string {
  const clamped = Math.max(0, Math.min(caret, content.length));
  const before = content.slice(0, clamped);
  const after = content.slice(clamped);
  const needsSpaceBefore =
    before.length > 0 && !/\s$/.test(before) && !before.endsWith("(");
  const needsSpaceAfter =
    after.length > 0 && !/^\s|[.,!?;:]/.test(after);
  const token = `${needsSpaceBefore ? " " : ""}${plantId}${needsSpaceAfter ? " " : ""}`;
  return before + token + after;
}
