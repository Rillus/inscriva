import { describe, expect, it } from "vitest";
import { buildCanonIndex } from "./canon-index.js";

describe("buildCanonIndex", () => {
  const files = new Map([
    [
      "00 Canon/Character Bible/Mara.md",
      `# Mara\n\nAlso known as: Mara Voss\n\nProtagonist of [[Monsterosso]].`,
    ],
    [
      "00 Canon/Continuity Log.md",
      `# Continuity\n\n- Festival is in three days\n- [[Mara]] knows about the rope`,
    ],
  ]);

  it("indexes canon terms by title and aliases", () => {
    const index = buildCanonIndex(files);

    expect(index.lookup("Mara")?.path).toBe("00 Canon/Character Bible/Mara.md");
    expect(index.lookup("mara voss")?.path).toBe(
      "00 Canon/Character Bible/Mara.md",
    );
  });

  it("collects outgoing wikilinks per file", () => {
    const index = buildCanonIndex(files);
    const mara = index.entries.find((e) => e.title === "Mara")!;

    expect(mara.links).toContain("Monsterosso");
  });

  it("finds terms mentioned in paragraph text", () => {
    const index = buildCanonIndex(files);
    const terms = index.termsInText("The festival deadline worried Mara.");

    expect(terms.map((t) => t.title)).toContain("Mara");
  });

  it("skips non-canon paths and non-markdown files", () => {
    const mixed = new Map([
      ...files,
      ["01 Draft/scene.md", "# Scene"],
      ["00 Canon/readme.txt", "not markdown"],
    ]);
    const index = buildCanonIndex(mixed);
    expect(index.entries.every((e) => e.path.startsWith("00 Canon/"))).toBe(
      true,
    );
  });

  it("autocompletes by title and alias prefix", () => {
    const index = buildCanonIndex(files);
    expect(index.autocomplete("mar").map((e) => e.title)).toContain("Mara");
    expect(index.autocomplete("mara v").map((e) => e.title)).toContain("Mara");
    expect(index.autocomplete("").length).toBeLessThanOrEqual(10);
  });
});
