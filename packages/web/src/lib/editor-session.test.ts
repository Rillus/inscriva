import { afterEach, describe, expect, it } from "vitest";
import {
  clampCaret,
  loadBookEditorSession,
  loadLastBookPath,
  saveBookEditorSession,
  saveFileViewState,
  saveLastBookPath,
  touchActiveFile,
  type FileViewState,
} from "./editor-session.js";

describe("editor-session", () => {
  afterEach(() => {
    localStorage.clear();
  });

  it("loads and saves per-book file view state", () => {
    const view: FileViewState = {
      caret: { from: 42, to: 42 },
      scrollTop: 120,
    };
    saveFileViewState("/books/demo", "chapters/01.md", view);
    const session = loadBookEditorSession("/books/demo");
    expect(session?.activePath).toBe("chapters/01.md");
    expect(session?.files["chapters/01.md"]).toEqual(view);
  });

  it("keeps view state for multiple files in one book", () => {
    saveFileViewState("/books/demo", "a.md", {
      caret: { from: 1, to: 1 },
      scrollTop: 10,
    });
    saveFileViewState("/books/demo", "b.md", {
      caret: { from: 5, to: 9 },
      scrollTop: 50,
    });
    const session = loadBookEditorSession("/books/demo");
    expect(session?.activePath).toBe("b.md");
    expect(session?.files["a.md"]?.scrollTop).toBe(10);
    expect(session?.files["b.md"]?.caret).toEqual({ from: 5, to: 9 });
  });

  it("returns null for missing or invalid storage", () => {
    expect(loadBookEditorSession("/missing")).toBeNull();
    localStorage.setItem(
      "inscriva.editorSession",
      JSON.stringify({ "/bad": "not an object" }),
    );
    expect(loadBookEditorSession("/bad")).toBeNull();
  });

  it("clamps caret offsets to document length", () => {
    expect(clampCaret({ from: 100, to: 200 }, 50)).toEqual({
      from: 50,
      to: 50,
    });
    expect(clampCaret({ from: 10, to: 30 }, 50)).toEqual({
      from: 10,
      to: 30,
    });
    expect(clampCaret({ from: 30, to: 10 }, 50)).toEqual({
      from: 30,
      to: 30,
    });
  });

  it("persists last opened book path", () => {
    expect(loadLastBookPath()).toBeNull();
    saveLastBookPath("/books/demo");
    expect(loadLastBookPath()).toBe("/books/demo");
  });

  it("records the active file without view state", () => {
    touchActiveFile("/books/demo", "chapters/02.md");
    const session = loadBookEditorSession("/books/demo");
    expect(session?.activePath).toBe("chapters/02.md");
    expect(session?.files).toEqual({});
  });

  it("merges into existing book session via saveBookEditorSession", () => {
    saveBookEditorSession("/books/demo", {
      activePath: "old.md",
      files: {
        "old.md": { caret: { from: 0, to: 0 }, scrollTop: 0 },
      },
    });
    saveBookEditorSession("/books/demo", {
      activePath: "new.md",
    });
    const session = loadBookEditorSession("/books/demo");
    expect(session?.activePath).toBe("new.md");
    expect(session?.files["old.md"]).toBeDefined();
  });
});
