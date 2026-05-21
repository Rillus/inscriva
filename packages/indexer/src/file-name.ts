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
