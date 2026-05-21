import { describe, expect, it } from "vitest";
import {
  REVISION_PASSES,
  findUnlinkedPlants,
  parsePlants,
} from "./revision-passes.js";

describe("REVISION_PASSES", () => {
  it("defines six revision passes with ids and labels", () => {
    expect(REVISION_PASSES).toHaveLength(6);
    expect(REVISION_PASSES.map((p) => p.id)).toEqual([
      "structure",
      "character",
      "tone",
      "continuity",
      "line",
      "read-aloud",
    ]);
    expect(REVISION_PASSES.every((p) => p.label && p.description)).toBe(true);
  });

  it("maps most passes to suggested LLM tasks", () => {
    const withTask = REVISION_PASSES.filter((p) => p.suggestedTaskId);
    expect(withTask.length).toBeGreaterThanOrEqual(5);
    expect(
      REVISION_PASSES.find((p) => p.id === "continuity")?.suggestedTaskId,
    ).toBe("review-continuity");
    expect(
      REVISION_PASSES.find((p) => p.id === "read-aloud")?.suggestedTaskId,
    ).toBeUndefined();
  });
});

describe("parsePlants", () => {
  it("extracts plant ids and labels from continuity hooks", () => {
    const text = "- P03 planted (rope on post)\n- P12 foreshadow";
    expect(parsePlants(text)).toEqual([
      { id: "P03", label: "P03 planted (rope on post)" },
      { id: "P12", label: "P12 foreshadow" },
    ]);
  });

  it("deduplicates repeated plant ids", () => {
    const text = "P03 planted\nLater P03 again";
    expect(parsePlants(text)).toEqual([{ id: "P03", label: "P03 planted" }]);
  });

  it("matches bare plant codes", () => {
    expect(parsePlants("Check P07 before P07 payoff")).toEqual([
      { id: "P07", label: "P07" },
    ]);
  });
});

describe("findUnlinkedPlants", () => {
  const outline = `## Continuity
- P03 planted (rope on post)
- P12 festival deadline
`;

  it("returns outline plants missing from the draft", () => {
    const draft = "She heard the rope against the post.";
    expect(findUnlinkedPlants(draft, outline)).toEqual(["P03", "P12"]);
  });

  it("treats a plant as linked when its id appears in the draft", () => {
    const draft = "P03 echoes in the rope against the post.";
    expect(findUnlinkedPlants(draft, outline)).toEqual(["P12"]);
  });

  it("ignores plants only mentioned outside the continuity section", () => {
    const outlineWithStray = `${outline}\n## Must include\n- P99 unrelated`;
    const draft = "P99 appears here but continuity plants do not.";
    expect(findUnlinkedPlants(draft, outlineWithStray)).toEqual([
      "P03",
      "P12",
    ]);
  });
});
