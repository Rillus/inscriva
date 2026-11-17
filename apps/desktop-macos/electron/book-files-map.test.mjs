import { describe, expect, it } from "vitest";
import { loadBookFilesMap } from "./book-files-map.mjs";

describe("loadBookFilesMap", () => {
  it("includes markdown and json files only", () => {
    const map = loadBookFilesMap({
      listFiles: () => ["a.md", "b.txt", "c.json", "d.jsonl"],
      readFile: (rel) => `content:${rel}`,
    });
    expect([...map.entries()]).toEqual([
      ["a.md", "content:a.md"],
      ["c.json", "content:c.json"],
      ["d.jsonl", "content:d.jsonl"],
    ]);
  });

  it("skips unreadable files", () => {
    const map = loadBookFilesMap({
      listFiles: () => ["ok.md", "bad.md"],
      readFile: (rel) => {
        if (rel === "bad.md") throw new Error("ENOENT");
        return "ok";
      },
    });
    expect(map.get("ok.md")).toBe("ok");
    expect(map.has("bad.md")).toBe(false);
  });
});