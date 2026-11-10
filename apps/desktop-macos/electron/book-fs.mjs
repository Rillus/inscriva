import fs from "node:fs";
import path from "node:path";
import os from "node:os";

/** Matches dev-bridge recents cap (Tauri stores unbounded). */
export const RECENTS_CAP = 10;

/**
 * @param {string} filePath
 */
function anchorSidecarPath(filePath) {
  const safe = filePath.replaceAll(/[/\\]/g, "__");
  return `.inscriva/anchors/${safe}.json`;
}

/**
 * @param {import("node:fs").PathLike} root
 */
function readTitle(root) {
  const config = path.join(root, ".inscriva/config.json");
  try {
    const raw = fs.readFileSync(config, "utf8");
    const v = JSON.parse(raw);
    if (typeof v.bookTitle === "string" && v.bookTitle) {
      return v.bookTitle;
    }
  } catch {
    /* use folder name */
  }
  return path.basename(root) || "Book";
}

/**
 * @param {import("node:fs").PathLike} root
 */
function ensureNotesFile(root) {
  const notes = path.join(root, ".inscriva/notes/notes.jsonl");
  if (fs.existsSync(notes)) return;
  fs.mkdirSync(path.dirname(notes), { recursive: true });
  fs.writeFileSync(notes, "");
}

/**
 * @param {string} bookRoot
 * @param {string} rel
 */
function safeJoin(bookRoot, rel) {
  if (path.isAbsolute(rel)) {
    throw new Error("Path must be relative to the book root");
  }
  const normalised = path.normalize(rel);
  if (normalised === ".." || normalised.startsWith(`..${path.sep}`)) {
    throw new Error("Path escapes book root");
  }
  const full = path.resolve(bookRoot, normalised);
  const rootResolved = path.resolve(bookRoot);
  const prefix = rootResolved.endsWith(path.sep)
    ? rootResolved
    : `${rootResolved}${path.sep}`;
  if (full !== rootResolved && !full.startsWith(prefix)) {
    throw new Error("Path escapes book root");
  }
  return full;
}

/**
 * @param {string} full
 * @param {string} bookRoot
 */
function assertConfined(full, bookRoot) {
  const rootReal = fs.realpathSync(bookRoot);
  let target = full;
  while (!fs.existsSync(target)) {
    const parent = path.dirname(target);
    if (parent === target) {
      throw new Error("Path escapes book root");
    }
    target = parent;
  }
  const targetReal = fs.realpathSync(target);
  const prefix = rootReal.endsWith(path.sep)
    ? rootReal
    : `${rootReal}${path.sep}`;
  if (targetReal !== rootReal && !targetReal.startsWith(prefix)) {
    throw new Error("Path escapes book root");
  }
}

/**
 * @param {string} dir
 * @param {string} root
 * @param {string[]} out
 */
function collectFiles(dir, root, out) {
  for (const name of fs.readdirSync(dir)) {
    if (name === ".git") continue;
    const entry = path.join(dir, name);
    const stat = fs.lstatSync(entry);
    if (stat.isDirectory()) {
      collectFiles(entry, root, out);
    } else if (stat.isFile()) {
      const rel = path.relative(root, entry).split(path.sep).join("/");
      out.push(rel);
    }
  }
}

/**
 * @param {{
 *   recentsPath?: string;
 *   libraryDir?: string;
 * }} [options]
 */
export function createBookFs(options = {}) {
  /** @type {string | null} */
  let root = null;
  const recentsPath =
    options.recentsPath ??
    path.join(os.homedir(), ".inscriva", "recents.json");
  const libraryDir =
    options.libraryDir ??
    path.join(os.homedir(), "Documents", "Inscriva");

  function requireRoot() {
    if (!root) throw new Error("No book open");
    return root;
  }

  function loadRecents() {
    if (!fs.existsSync(recentsPath)) return [];
    try {
      const raw = fs.readFileSync(recentsPath, "utf8");
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((p) => typeof p === "string")
        : [];
    } catch {
      return [];
    }
  }

  function saveRecents(recents) {
    const capped = recents.slice(0, RECENTS_CAP);
    fs.mkdirSync(path.dirname(recentsPath), { recursive: true });
    fs.writeFileSync(recentsPath, `${JSON.stringify(capped, null, 2)}\n`);
  }

  return {
    openBook(bookPath) {
      const resolved = path.resolve(bookPath);
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        throw new Error(`Not a directory: ${bookPath}`);
      }
      ensureNotesFile(resolved);
      const title = readTitle(resolved);
      root = resolved;
      const recents = loadRecents().filter((p) => p !== resolved);
      recents.unshift(resolved);
      saveRecents(recents);
      return { id: resolved, path: resolved, title };
    },

    listFiles() {
      const bookRoot = requireRoot();
      const files = [];
      collectFiles(bookRoot, bookRoot, files);
      files.sort();
      return files;
    },

    readFile(rel) {
      const bookRoot = requireRoot();
      const full = safeJoin(bookRoot, rel);
      assertConfined(full, bookRoot);
      return fs.readFileSync(full, "utf8");
    },

    writeFile(rel, content) {
      const bookRoot = requireRoot();
      const full = safeJoin(bookRoot, rel);
      assertConfined(full, bookRoot);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content);
    },

    renameFile(from, to) {
      if (from === to) return;
      const bookRoot = requireRoot();
      const oldFull = safeJoin(bookRoot, from);
      const newFull = safeJoin(bookRoot, to);
      assertConfined(oldFull, bookRoot);
      assertConfined(newFull, bookRoot);
      if (fs.existsSync(newFull)) {
        throw new Error(`File already exists: ${to}`);
      }
      fs.renameSync(oldFull, newFull);

      const oldSidecar = safeJoin(bookRoot, anchorSidecarPath(from));
      const newSidecar = safeJoin(bookRoot, anchorSidecarPath(to));
      if (fs.existsSync(oldSidecar)) {
        const raw = fs.readFileSync(oldSidecar, "utf8");
        const data = JSON.parse(raw);
        if (data && typeof data === "object") {
          data.file = to;
        }
        fs.mkdirSync(path.dirname(newSidecar), { recursive: true });
        fs.writeFileSync(newSidecar, `${JSON.stringify(data, null, 2)}\n`);
        fs.rmSync(oldSidecar, { force: true });
      }
    },

    deleteFile(rel) {
      const bookRoot = requireRoot();
      const full = safeJoin(bookRoot, rel);
      assertConfined(full, bookRoot);
      if (!fs.existsSync(full)) {
        throw new Error(`File not found: ${rel}`);
      }
      fs.rmSync(full, { force: true });
      const sidecar = safeJoin(bookRoot, anchorSidecarPath(rel));
      if (fs.existsSync(sidecar)) {
        fs.rmSync(sidecar, { force: true });
      }
    },

    getRecents() {
      return loadRecents();
    },

    addRecent(bookPath) {
      const recents = loadRecents().filter((p) => p !== bookPath);
      recents.unshift(bookPath);
      saveRecents(recents);
    },

    getBooksLibraryPath() {
      fs.mkdirSync(libraryDir, { recursive: true });
      return libraryDir;
    },
  };
}
