import { describe, expect, it } from "vitest";
import {
  buildMovedPath,
  buildNewFilePath,
  buildRenamedPath,
  defaultNewFileDirectory,
  fileBaseName,
  fileDirectory,
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

describe("buildNewFilePath", () => {
  it("joins a directory and base name with .md", () => {
    expect(buildNewFilePath("02 Drafts/Chapters", "Ch03 Opening")).toBe(
      "02 Drafts/Chapters/Ch03 Opening.md",
    );
  });

  it("creates a root-level file when the directory is empty", () => {
    expect(buildNewFilePath("", "Notes")).toBe("Notes.md");
  });

  it("throws when the name is invalid", () => {
    expect(() => buildNewFilePath("00 Canon", "../x")).toThrow(/invalid/i);
  });
});

describe("defaultNewFileDirectory", () => {
  const paths = [
    "00 Canon/Mara.md",
    "02 Drafts/Chapters/Ch01.md",
    "01 Outlines/Chapter Outlines/Ch01.md",
  ];

  it("uses the parent folder of the active file", () => {
    expect(defaultNewFileDirectory(paths, "02 Drafts/Chapters/Ch01.md")).toBe(
      "02 Drafts/Chapters",
    );
  });

  it("prefers the drafts folder when there is no active file", () => {
    expect(defaultNewFileDirectory(paths, null)).toBe("02 Drafts/Chapters");
  });

  it("returns empty when no drafts folder exists", () => {
    expect(defaultNewFileDirectory(["00 Canon/Mara.md"], null)).toBe("");
  });
});

describe("fileDirectory", () => {
  it("returns the parent folder path", () => {
    expect(fileDirectory("02 Drafts/Chapters/Ch01.md")).toBe("02 Drafts/Chapters");
    expect(fileDirectory("Notes.md")).toBe("");
  });
});

describe("buildMovedPath", () => {
  it("moves a file into another folder keeping its name", () => {
    expect(
      buildMovedPath("01 Outlines/Chapter Outlines/Ch01.md", "02 Drafts/Chapters"),
    ).toBe("02 Drafts/Chapters/Ch01.md");
  });

  it("moves a file to the book root", () => {
    expect(buildMovedPath("00 Canon/Mara.md", "")).toBe("Mara.md");
  });

  it("returns the same path when the directory is unchanged", () => {
    expect(buildMovedPath("02 Drafts/Chapters/Ch01.md", "02 Drafts/Chapters")).toBe(
      "02 Drafts/Chapters/Ch01.md",
    );
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
