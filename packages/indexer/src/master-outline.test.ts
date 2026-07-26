import { describe, expect, it } from "vitest";
import { findMasterOutlinePath, MASTER_OUTLINE_PATH } from "./master-outline.js";

describe("findMasterOutlinePath", () => {
  it("finds the canonical master outline path", () => {
    const paths = [
      "01 Outlines/Master Outline.md",
      "01 Outlines/Chapter Outlines/Ch01.md",
    ];
    expect(findMasterOutlinePath(paths)).toBe(MASTER_OUTLINE_PATH);
  });
});
