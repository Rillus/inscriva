import { describe, expect, it } from "vitest";
import { repoNameFromUrl } from "./git-utils.js";

describe("repoNameFromUrl", () => {
  it("parses HTTPS remotes", () => {
    expect(repoNameFromUrl("https://github.com/user/monsterosso.git")).toBe(
      "monsterosso",
    );
  });

  it("parses SSH remotes", () => {
    expect(repoNameFromUrl("git@github.com:user/monsterosso.git")).toBe(
      "monsterosso",
    );
  });
});
