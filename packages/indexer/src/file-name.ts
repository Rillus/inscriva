const MAX_BASE_LENGTH = 180;

/** Letters, digits, and common punctuation used in chapter filenames. */
const BASE_NAME_RE = /^[a-zA-Z0-9]([a-zA-Z0-9._\- '()]*[a-zA-Z0-9.)])?$/;

export function fileBaseName(path: string): string {
  const name = path.split(/[/\\]/).pop() ?? path;
  return name.replace(/\.md$/i, "");
}

export function fileNameFromBase(base: string): string {
  const trimmed = base.trim();
  const withoutExt = trimmed.replace(/\.md$/i, "");
  return `${withoutExt}.md`;
}

export function validateFileBaseName(base: string): string | null {
  const trimmed = base.trim();
  if (!trimmed) return "Name cannot be empty";

  const name = trimmed.replace(/\.md$/i, "");
  if (!name) return "Name cannot be empty";
  if (name.includes("/") || name.includes("\\") || name.includes("..")) {
    return "Invalid file name";
  }
  if (name.length > MAX_BASE_LENGTH) return "Name is too long";
  if (!BASE_NAME_RE.test(name)) {
    return "Use letters, numbers, spaces, and - _ . ' ( ) only";
  }
  return null;
}

export function fileDirectory(path: string): string {
  const slash = path.lastIndexOf("/");
  const backslash = path.lastIndexOf("\\");
  const splitAt = Math.max(slash, backslash);
  return splitAt >= 0 ? path.slice(0, splitAt) : "";
}

export function buildMovedPath(from: string, toDir: string): string {
  const fileName = from.split(/[/\\]/).pop();
  if (!fileName) throw new Error("Invalid file path");

  const normalisedDir = toDir.replace(/\\/g, "/").replace(/\/$/, "");
  const currentDir = fileDirectory(from);
  if (normalisedDir === currentDir) return from;

  return normalisedDir ? `${normalisedDir}/${fileName}` : fileName;
}

export function buildNewFilePath(dir: string, base: string): string {
  const error = validateFileBaseName(base);
  if (error) throw new Error(error);

  const fileName = fileNameFromBase(base);
  const normalisedDir = dir.replace(/\\/g, "/").replace(/\/$/, "");
  return normalisedDir ? `${normalisedDir}/${fileName}` : fileName;
}

/** Suggested folder for a new markdown file in an open book. */
export function defaultNewFileDirectory(
  filePaths: string[],
  activePath?: string | null,
): string {
  if (activePath) {
    const slash = activePath.lastIndexOf("/");
    const backslash = activePath.lastIndexOf("\\");
    const splitAt = Math.max(slash, backslash);
    if (splitAt >= 0) return activePath.slice(0, splitAt);
  }

  if (filePaths.some((p) => p.startsWith("02 Drafts/Chapters/"))) {
    return "02 Drafts/Chapters";
  }

  return "";
}

export function buildRenamedPath(oldPath: string, newBase: string): string {
  const error = validateFileBaseName(newBase);
  if (error) throw new Error(error);

  const slash = oldPath.lastIndexOf("/");
  const backslash = oldPath.lastIndexOf("\\");
  const splitAt = Math.max(slash, backslash);
  const dir = splitAt >= 0 ? oldPath.slice(0, splitAt) : "";
  const fileName = fileNameFromBase(newBase);
  return dir ? `${dir}/${fileName}` : fileName;
}
