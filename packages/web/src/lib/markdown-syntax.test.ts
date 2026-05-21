import { describe, expect, it } from "vitest";
import { headingTitleStart } from "./markdown-syntax.js";

describe("headingTitleStart", () => {
  it("skips a single space after hash marks", () => {
    expect(headingTitleStart("# Title", 1, 7)).toBe(2);
  });

  it("skips multiple spaces and tabs", () => {
    expect(headingTitleStart("##  \tSub", 2, 8)).toBe(5);
  });

  it("returns mark end when there is no whitespace", () => {
    expect(headingTitleStart("###", 3, 3)).toBe(3);
  });
});
