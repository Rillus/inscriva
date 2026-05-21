import { describe, expect, it } from "vitest";
import {
  buildEditorSearch,
  filePathInBook,
  lineToOffset,
  offsetToLine,
  parseEditorLocation,
  resolveOpenFilePath,
} from "./editor-location.js";

describe("editor-location", () => {
  const paths = [
    "02 Drafts/Chapters/Ch01.md",
    "01 Outlines/Chapter Outlines/Ch01.md",
  ];

  it("parses file and line from search string", () => {
    expect(
      parseEditorLocation("?file=02%20Drafts%2FChapters%2FCh01.md&line=12"),
    ).toEqual({
      file: "02 Drafts/Chapters/Ch01.md",
      line: 12,
    });
  });

  it("returns nulls when params are missing or invalid", () => {
    expect(parseEditorLocation("")).toEqual({ file: null, line: null });
    expect(parseEditorLocation("?line=0")).toEqual({ file: null, line: null });
    expect(parseEditorLocation("?file=&line=abc")).toEqual({
      file: null,
      line: null,
    });
  });

  it("builds search string and preserves other params", () => {
    const preserve = new URLSearchParams("demo=1");
    const built = buildEditorSearch({
      file: "02 Drafts/Chapters/Ch01.md",
      line: 5,
      preserve,
    });
    const params = new URLSearchParams(built.slice(1));
    expect(params.get("demo")).toBe("1");
    expect(params.get("file")).toBe("02 Drafts/Chapters/Ch01.md");
    expect(params.get("line")).toBe("5");

    const cleared = buildEditorSearch({ file: null, line: null, preserve });
    expect(new URLSearchParams(cleared.slice(1)).get("demo")).toBe("1");
    expect(new URLSearchParams(cleared.slice(1)).get("file")).toBeNull();
  });

  it("converts between offsets and 1-based line numbers", () => {
    const doc = "one\n\ntwo\nthree";
    expect(offsetToLine(doc, 0)).toBe(1);
    expect(offsetToLine(doc, 4)).toBe(2);
    expect(offsetToLine(doc, 5)).toBe(3);
    expect(lineToOffset(doc, 3)).toBe(5);
    expect(lineToOffset(doc, 4)).toBe(9);
    expect(lineToOffset(doc, 5)).toBe(doc.length);
  });

  it("checks file membership in the book", () => {
    expect(filePathInBook("02 Drafts/Chapters/Ch01.md", paths)).toBe(
      "02 Drafts/Chapters/Ch01.md",
    );
    expect(filePathInBook("missing.md", paths)).toBeNull();
  });

  it("prefers URL file over session file", () => {
    expect(
      resolveOpenFilePath({
        filePaths: paths,
        urlFile: "01 Outlines/Chapter Outlines/Ch01.md",
        sessionFile: "02 Drafts/Chapters/Ch01.md",
        fallbackFile: "02 Drafts/Chapters/Ch01.md",
      }),
    ).toBe("01 Outlines/Chapter Outlines/Ch01.md");
  });

  it("falls back to session then default draft", () => {
    expect(
      resolveOpenFilePath({
        filePaths: paths,
        urlFile: "missing.md",
        sessionFile: "02 Drafts/Chapters/Ch01.md",
        fallbackFile: "01 Outlines/Chapter Outlines/Ch01.md",
      }),
    ).toBe("02 Drafts/Chapters/Ch01.md");

    expect(
      resolveOpenFilePath({
        filePaths: paths,
        urlFile: null,
        sessionFile: null,
        fallbackFile: "01 Outlines/Chapter Outlines/Ch01.md",
      }),
    ).toBe("01 Outlines/Chapter Outlines/Ch01.md");
  });
});
