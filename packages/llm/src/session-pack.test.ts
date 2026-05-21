import { describe, expect, it } from "vitest";
import { formatSessionPack } from "./session-pack.js";
import type { AssembledContext } from "./types.js";

const SAMPLE: AssembledContext = {
  system: "You help draft scenes for literary fiction.",
  user: "## Style Guide\n\nClose third person.\n\n## Author note\n\nKeep it tense.",
  sections: [
    {
      label: "Style Guide",
      path: "00 Canon/Style Guide.md",
      chars: 42,
      included: true,
    },
    {
      label: "Character Bible",
      path: "00 Canon/Character Bible.md",
      chars: 8000,
      included: false,
    },
  ],
  estimatedTokens: 180,
};

describe("formatSessionPack", () => {
  it("includes task, book, and chapter metadata", () => {
    const md = formatSessionPack(SAMPLE, {
      taskId: "draft-scene",
      bookTitle: "Appledore",
      chapterKey: "Ch01",
    });

    expect(md).toContain("draft-scene");
    expect(md).toContain("Appledore");
    expect(md).toContain("Ch01");
  });

  it("lists sections with included and excluded status", () => {
    const md = formatSessionPack(SAMPLE, { taskId: "draft-scene" });

    expect(md).toContain("Style Guide");
    expect(md).toMatch(/included/i);
    expect(md).toContain("Character Bible");
    expect(md).toMatch(/excluded/i);
  });

  it("embeds system instructions and assembled user context", () => {
    const md = formatSessionPack(SAMPLE, { taskId: "draft-scene" });

    expect(md).toContain("You help draft scenes");
    expect(md).toContain("Close third person");
    expect(md).toContain("Keep it tense");
  });

  it("shows estimated token budget", () => {
    const md = formatSessionPack(SAMPLE, { taskId: "draft-scene" });
    expect(md).toContain("180");
  });

  it("omits provider, model, and API key placeholders", () => {
    const md = formatSessionPack(SAMPLE, { taskId: "draft-scene" });
    expect(md).not.toMatch(/\b(provider|model|api[_\s-]?key)\b/i);
    expect(md).not.toMatch(/sk-[a-z0-9]/i);
  });
});
