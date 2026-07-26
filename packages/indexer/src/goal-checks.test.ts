import { describe, expect, it } from "vitest";
import { isGoalChecked, toggleGoalCheck } from "./goal-checks.js";

describe("goal-checks", () => {
  it("uses manual override when set", () => {
    let checks = toggleGoalCheck({}, "Ch01", "Festival", true);
    expect(isGoalChecked(checks, "Ch01", "Festival", false)).toBe(true);
    checks = toggleGoalCheck(checks, "Ch01", "Festival", false);
    expect(isGoalChecked(checks, "Ch01", "Festival", true)).toBe(false);
  });

  it("falls back to heuristic when no manual tick", () => {
    expect(isGoalChecked({}, "Ch01", "Festival", true)).toBe(true);
    expect(isGoalChecked({}, "Ch01", "Festival", false)).toBe(false);
  });
});
