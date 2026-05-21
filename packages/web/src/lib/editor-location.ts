export type EditorLocation = {
  file: string | null;
  line: number | null;
};

export function parseEditorLocation(search: string): EditorLocation {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const file = params.get("file")?.trim();
  const lineRaw = params.get("line");
  const line = lineRaw ? Number.parseInt(lineRaw, 10) : Number.NaN;
  return {
    file: file && file.length > 0 ? file : null,
    line: Number.isFinite(line) && line > 0 ? line : null,
  };
}

export function buildEditorSearch(params: {
  file?: string | null;
  line?: number | null;
  preserve?: URLSearchParams;
}): string {
  const next = new URLSearchParams(params.preserve?.toString() ?? undefined);
  if (params.file) next.set("file", params.file);
  else next.delete("file");

  if (params.line && params.line > 0) next.set("line", String(params.line));
  else next.delete("line");

  const built = next.toString();
  return built ? `?${built}` : "";
}

export function replaceEditorLocation(search: string): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  url.search = search.startsWith("?") ? search.slice(1) : search;
  window.history.replaceState(null, "", url);
}

export function offsetToLine(doc: string, offset: number): number {
  const clamped = Math.max(0, Math.min(offset, doc.length));
  let line = 1;
  for (let i = 0; i < clamped; i++) {
    if (doc[i] === "\n") line++;
  }
  return line;
}

export function lineToOffset(doc: string, line: number): number {
  if (line <= 1) return 0;
  let currentLine = 1;
  for (let i = 0; i < doc.length; i++) {
    if (doc[i] === "\n") {
      currentLine++;
      if (currentLine === line) return i + 1;
    }
  }
  return doc.length;
}

export function filePathInBook(
  file: string,
  filePaths: string[],
): string | null {
  return filePaths.includes(file) ? file : null;
}

export function resolveOpenFilePath(params: {
  filePaths: string[];
  urlFile: string | null;
  sessionFile: string | null;
  fallbackFile: string | null;
}): string | null {
  const fromUrl = params.urlFile
    ? filePathInBook(params.urlFile, params.filePaths)
    : null;
  if (fromUrl) return fromUrl;

  const fromSession = params.sessionFile
    ? filePathInBook(params.sessionFile, params.filePaths)
    : null;
  if (fromSession) return fromSession;

  return params.fallbackFile
    ? filePathInBook(params.fallbackFile, params.filePaths)
    : null;
}

export function viewStateForLine(
  doc: string,
  line: number | null | undefined,
  saved?: { caret: { from: number; to: number }; scrollTop: number } | null,
): { caret: { from: number; to: number }; scrollTop: number } | null {
  if (!line) return saved ?? null;
  const from = lineToOffset(doc, line);
  return {
    caret: { from, to: from },
    scrollTop: saved?.scrollTop ?? 0,
  };
}
