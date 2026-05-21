import { describe, expect, it } from "vitest";
import { parseBookFilePayload } from "./file-events.js";

describe("parseBookFilePayload", () => {
  it("accepts valid file events", () => {
    expect(
      parseBookFilePayload({ path: "02 Drafts/Chapters/Ch01.md", kind: "modified" }),
    ).toEqual({
      path: "02 Drafts/Chapters/Ch01.md",
      kind: "modified",
    });
  });

  it("rejects unknown event kinds", () => {
    expect(parseBookFilePayload({ path: "a.md", kind: "renamed" })).toBeNull();
  });

  it("rejects malformed payloads", () => {
    expect(parseBookFilePayload(null)).toBeNull();
    expect(parseBookFilePayload({ path: 1, kind: "modified" })).toBeNull();
  });
});
