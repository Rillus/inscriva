import { describe, expect, it } from "vitest";
import { insertPlantReference } from "./plant-link.js";

describe("insertPlantReference", () => {
  it("inserts plant id at caret with surrounding spaces", () => {
    const next = insertPlantReference("Hello world.", 5, "P03");
    expect(next).toBe("Hello P03 world.");
  });

  it("appends when caret is at end", () => {
    const next = insertPlantReference("End of line.", 12, "P03");
    expect(next).toBe("End of line. P03");
  });
});
