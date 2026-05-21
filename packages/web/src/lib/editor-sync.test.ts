import { describe, expect, it } from "vitest";
import { shouldReplaceEditorDocument } from "./editor-sync.js";

describe("shouldReplaceEditorDocument", () => {
  it("returns true when the editor doc differs from incoming content", () => {
    expect(shouldReplaceEditorDocument("old", "new")).toBe(true);
  });

  it("returns false when the editor already matches incoming content", () => {
    expect(shouldReplaceEditorDocument("same", "same")).toBe(false);
  });
});
