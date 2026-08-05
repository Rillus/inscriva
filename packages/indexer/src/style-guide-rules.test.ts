import { describe, expect, it } from "vitest";
import {
  checkStyleGuideViolations,
  parseStyleGuideRules,
  type StyleGuideViolation,
} from "./style-guide-rules.js";

const SAMPLE = `# Style Guide

## Avoid
- suddenly
- very
- adverbs

## Prefer
- close third person
- concrete nouns
`;

describe("parseStyleGuideRules", () => {
  it("parses forbidden phrases from Avoid section", () => {
    const rules = parseStyleGuideRules(SAMPLE);
    expect(rules.filter((r) => r.kind === "forbid").map((r) => r.phrase)).toEqual(
      expect.arrayContaining(["suddenly", "very", "adverbs"]),
    );
  });

  it("parses prefer hints separately", () => {
    const rules = parseStyleGuideRules(SAMPLE);
    expect(rules.some((r) => r.kind === "prefer" && r.phrase.includes("third"))).toBe(
      true,
    );
  });
});

describe("checkStyleGuideViolations", () => {
  it("flags forbidden phrases in draft text", () => {
    const rules = parseStyleGuideRules(SAMPLE);
    const violations = checkStyleGuideViolations(
      "She very suddenly turned away.",
      rules,
    );
    expect(violations.map((v) => v.phrase)).toEqual(
      expect.arrayContaining(["very", "suddenly"]),
    );
  });

  it("flags adverb-like words when adverbs rule present", () => {
    const rules = parseStyleGuideRules(SAMPLE);
    const violations = checkStyleGuideViolations("She walked quickly.", rules);
    expect(violations.some((v) => v.ruleId === "adverbs")).toBe(true);
  });

  it("returns empty when draft is clean", () => {
    const rules = parseStyleGuideRules(SAMPLE);
    const violations: StyleGuideViolation[] = checkStyleGuideViolations(
      "She turned away.",
      rules,
    );
    expect(violations).toHaveLength(0);
  });
});
