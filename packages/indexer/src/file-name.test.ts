import { describe, expect, it } from "vitest";
import {
  buildRenamedPath,
  fileBaseName,
  fileNameFromBase,
  validateFileBaseName,
} from "./file-name.js";

describe("validateFileBaseName", () => {
  it("accepts typical chapter names", () => {
    expect(validateFileBaseName("Ch01 - The Eighth A")).toBeNull();
    expect(validateFileBaseName("Mara")).toBeNull();
    expect(validateFileBaseName("Master Outline")).toBeNull();
  });

  it("rejects empty names", () => {
    expect(validateFileBaseName("")).toMatch(/empty/i);
    expect(validateFileBaseName("   ")).toMatch(/empty/i);
  });

  it("rejects path separators and traversal", () => {
    expect(validateFileBaseName("../evil")).toMatch(/invalid/i);
    expect(validateFileBaseName("foo/bar")).toMatch(/invalid/i);
    expect(validateFileBaseName("foo\\bar")).toMatch(/invalid/i);
  });

  it("rejects characters that are not url-safe", () => {
    const msg = validateFileBaseName("hello world!");
    expect(msg).not.toBeNull();
    expect(validateFileBaseName("file:name")).not.toBeNull();
    expect(validateFileBaseName("café")).not.toBeNull();
  });
});

describe("fileBaseName", () => {
  it("strips directory and .md extension", () => {
    expect(fileBaseName("02 Drafts/Chapters/Ch01.md")).toBe("Ch01");
  });
});

describe("fileNameFromBase", () => {
  it("normalises to a .md filename", () => {
    expect(fileNameFromBase("Ch01")).toBe("Ch01.md");
    expect(fileNameFromBase("Ch01.md")).toBe("Ch01.md");
  });
});

describe("buildRenamedPath", () => {
  it("keeps the parent folder and applies .md", () => {
    expect(buildRenamedPath("02 Drafts/Chapters/Ch01.md", "Ch02 Opening")).toBe(
      "02 Drafts/Chapters/Ch02 Opening.md",
    );
  });

  it("throws when the new name is invalid", () => {
    expect(() => buildRenamedPath("a.md", "../x")).toThrow(/invalid/i);
  });
});
