import { describe, expect, it } from "vitest";
import { confirmDeleteFileMessage } from "./confirm-delete-file.js";

describe("confirmDeleteFileMessage", () => {
  it("names the file and warns the action is destructive", () => {
    const msg = confirmDeleteFileMessage("02 Drafts/Chapters/Ch01 - Opening.md");
    expect(msg).toContain("Ch01 - Opening.md");
    expect(msg).toMatch(/sure|delete/i);
  });
});
