import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createBookFs,
  isPathUnderRoot,
  RECENTS_CAP,
} from "./book-fs.mjs";

describe("book-fs", () => {
  /** @type {string} */
  let tmp;
  /** @type {string} */
  let recentsPath;
  /** @type {ReturnType<typeof createBookFs>} */
  let bookFs;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "inscriva-book-fs-"));
    recentsPath = path.join(tmp, "recents.json");
    bookFs = createBookFs({ recentsPath, libraryDir: path.join(tmp, "library") });
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function makeBookDir(name = "My Book") {
    const bookRoot = path.join(tmp, "library", name);
    fs.mkdirSync(path.join(bookRoot, ".inscriva", "notes"), { recursive: true });
    fs.writeFileSync(
      path.join(bookRoot, ".inscriva", "config.json"),
      JSON.stringify({ bookTitle: "Configured Title" }),
    );
    fs.mkdirSync(path.join(bookRoot, ".git"), { recursive: true });
    fs.writeFileSync(path.join(bookRoot, ".git", "HEAD"), "ref: refs/heads/main\n");
    fs.writeFileSync(path.join(bookRoot, "chapter.md"), "# One\n");
    return bookRoot;
  }

  it("opens a book, derives title from config, and ensures notes file", () => {
    const bookRoot = makeBookDir();
    const handle = bookFs.openBook(bookRoot);
    expect(handle).toEqual({
      id: bookRoot,
      path: bookRoot,
      title: "Configured Title",
    });
    expect(fs.existsSync(path.join(bookRoot, ".inscriva/notes/notes.jsonl"))).toBe(
      true,
    );
  });

  it("lists files recursively and skips .git", async () => {
    const bookRoot = makeBookDir();
    bookFs.openBook(bookRoot);
    const files = bookFs.listFiles();
    expect(files).toContain("chapter.md");
    expect(files.some((f) => f.includes(".git"))).toBe(false);
    expect(files).toEqual([...files].sort());
  });

  it("reads, writes, renames, and deletes within the book root", () => {
    const bookRoot = makeBookDir();
    bookFs.openBook(bookRoot);
    bookFs.writeFile("drafts/new.md", "hello");
    expect(bookFs.readFile("drafts/new.md")).toBe("hello");
    bookFs.renameFile("drafts/new.md", "drafts/renamed.md");
    expect(bookFs.readFile("drafts/renamed.md")).toBe("hello");
    bookFs.deleteFile("drafts/renamed.md");
    expect(() => bookFs.readFile("drafts/renamed.md")).toThrow();
  });

  it("rejects path escapes and symlink escapes", () => {
    const bookRoot = makeBookDir();
    bookFs.openBook(bookRoot);
    expect(() => bookFs.readFile("/etc/passwd")).toThrow(/relative/);
    expect(() => bookFs.readFile("../outside.md")).toThrow(/escapes/);

    const linkPath = path.join(bookRoot, "escape-link.md");
    const outside = path.join(tmp, "outside-secret.txt");
    fs.writeFileSync(outside, "secret");
    fs.symlinkSync(outside, linkPath);
    expect(() => bookFs.readFile("escape-link.md")).toThrow(/escapes/);
  });

  it("errors when no book is open", () => {
    expect(() => bookFs.listFiles()).toThrow(/No book open/);
  });

  it("dedupes recents and caps length", () => {
    const paths = Array.from({ length: RECENTS_CAP + 3 }, (_, i) =>
      path.join(tmp, "library", `book-${i}`),
    );
    for (const p of paths) {
      bookFs.addRecent(p);
    }
    const recents = bookFs.getRecents();
    expect(recents).toHaveLength(RECENTS_CAP);
    expect(recents[0]).toBe(paths.at(-1));
    bookFs.addRecent(paths[0]);
    expect(bookFs.getRecents()[0]).toBe(paths[0]);
    expect(bookFs.getRecents().filter((p) => p === paths[0])).toHaveLength(1);
  });

  it("returns injectable library path", () => {
    const lib = bookFs.getBooksLibraryPath();
    expect(lib).toBe(path.join(tmp, "library"));
    expect(fs.statSync(lib).isDirectory()).toBe(true);
  });

  it("falls back to folder name when config is missing", () => {
    const bookRoot = path.join(tmp, "library", "Plain Folder");
    fs.mkdirSync(bookRoot, { recursive: true });
    const handle = bookFs.openBook(bookRoot);
    expect(handle.title).toBe("Plain Folder");
  });

  it("rejects opening a non-directory", () => {
    bookFs.getBooksLibraryPath();
    const file = path.join(tmp, "library", "not-a-book.txt");
    fs.writeFileSync(file, "nope");
    expect(() => bookFs.openBook(file)).toThrow(/Not a directory/);
  });

  it("moves anchor sidecars on rename and removes them on delete", () => {
    const bookRoot = makeBookDir();
    bookFs.openBook(bookRoot);
    const chapter = "chapter.md";
    fs.writeFileSync(path.join(bookRoot, chapter), "# x");
    const sidecarRel = ".inscriva/anchors/chapter.md.json";
    fs.mkdirSync(path.dirname(path.join(bookRoot, sidecarRel)), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(bookRoot, sidecarRel),
      JSON.stringify({ file: chapter }),
    );
    bookFs.renameFile(chapter, "moved.md");
    expect(fs.existsSync(path.join(bookRoot, sidecarRel))).toBe(false);
    const movedSidecar = path.join(
      bookRoot,
      ".inscriva/anchors/moved.md.json",
    );
    expect(JSON.parse(fs.readFileSync(movedSidecar, "utf8")).file).toBe(
      "moved.md",
    );
    bookFs.deleteFile("moved.md");
    expect(fs.existsSync(movedSidecar)).toBe(false);
  });

  it("no-ops identical rename and rejects clobbering rename", () => {
    const bookRoot = makeBookDir();
    bookFs.openBook(bookRoot);
    bookFs.renameFile("chapter.md", "chapter.md");
    fs.writeFileSync(path.join(bookRoot, "other.md"), "x");
    expect(() => bookFs.renameFile("chapter.md", "other.md")).toThrow(
      /already exists/,
    );
  });

  it("errors when deleting a missing file", () => {
    const bookRoot = makeBookDir();
    bookFs.openBook(bookRoot);
    expect(() => bookFs.deleteFile("missing.md")).toThrow(/not found/i);
  });

  it("rejects unapproved book paths", () => {
    const outside = path.join(tmp, "outside-book");
    fs.mkdirSync(outside, { recursive: true });
    expect(() => bookFs.openBook(outside)).toThrow(/not approved/);
  });

  it("allows opening a recent outside the library", () => {
    const outside = path.join(tmp, "recent-book");
    fs.mkdirSync(outside, { recursive: true });
    fs.writeFileSync(recentsPath, JSON.stringify([outside]));
    const handle = bookFs.openBook(outside);
    expect(handle.path).toBe(outside);
  });

  it("rejects adding an unapproved path to recents", () => {
    const outside = path.join(tmp, "sneaky-book");
    fs.mkdirSync(outside, { recursive: true });
    expect(() => bookFs.addRecent(outside)).toThrow(/not approved/);
    expect(bookFs.getRecents()).not.toContain(outside);
    expect(() => bookFs.openBook(outside)).toThrow(/not approved/);
  });

  it("pickBookFolder approves the chosen path for openBook", async () => {
    const chosen = path.join(tmp, "picked-book");
    fs.mkdirSync(chosen, { recursive: true });
    const fsWithPicker = createBookFs({
      recentsPath,
      libraryDir: path.join(tmp, "library"),
      pickFolderDialog: async () => chosen,
    });
    await expect(fsWithPicker.pickBookFolder({ prompt: "Pick" })).resolves.toBe(
      chosen,
    );
    const handle = fsWithPicker.openBook(chosen);
    expect(handle.path).toBe(chosen);
  });

  it("pickBookFolder returns null when the dialog is cancelled", async () => {
    const fsWithPicker = createBookFs({
      recentsPath,
      libraryDir: path.join(tmp, "library"),
      pickFolderDialog: async () => null,
    });
    await expect(fsWithPicker.pickBookFolder()).resolves.toBeNull();
  });

  it("does not treat library prefix lookalikes as inside the library", () => {
    const library = path.join(tmp, "books");
    const evil = `${library}-evil`;
    expect(isPathUnderRoot(path.join(evil, "x"), library)).toBe(false);
    expect(isPathUnderRoot(path.join(library, "x"), library)).toBe(true);
    const evilBook = path.join(evil, "stolen");
    fs.mkdirSync(evilBook, { recursive: true });
    const fsWithLib = createBookFs({
      recentsPath,
      libraryDir: library,
    });
    expect(() => fsWithLib.openBook(evilBook)).toThrow(/not approved/);
  });
});
