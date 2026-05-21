export type FileViewState = {
  caret: { from: number; to: number };
  scrollTop: number;
};

export type BookEditorSession = {
  activePath: string;
  files: Record<string, FileViewState>;
};

const SESSION_STORAGE_KEY = "inscriva.editorSession";
const LAST_BOOK_STORAGE_KEY = "inscriva.workspace.lastBook";

function readAllSessions(): Record<string, BookEditorSession> {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, BookEditorSession>;
  } catch {
    return {};
  }
}

function writeAllSessions(sessions: Record<string, BookEditorSession>): void {
  localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessions));
}

function isBookEditorSession(value: unknown): value is BookEditorSession {
  if (!value || typeof value !== "object") return false;
  const session = value as BookEditorSession;
  if (typeof session.activePath !== "string") return false;
  if (!session.files || typeof session.files !== "object") return false;
  return true;
}

export function loadBookEditorSession(
  bookPath: string,
): BookEditorSession | null {
  const sessions = readAllSessions();
  const session = sessions[bookPath];
  return isBookEditorSession(session) ? session : null;
}

export function saveBookEditorSession(
  bookPath: string,
  partial: Partial<BookEditorSession> & Pick<BookEditorSession, "activePath">,
): void {
  const sessions = readAllSessions();
  const existing = sessions[bookPath];
  sessions[bookPath] = {
    activePath: partial.activePath,
    files: { ...(existing?.files ?? {}), ...(partial.files ?? {}) },
  };
  writeAllSessions(sessions);
}

export function touchActiveFile(bookPath: string, filePath: string): void {
  const sessions = readAllSessions();
  const existing = sessions[bookPath];
  sessions[bookPath] = {
    activePath: filePath,
    files: existing?.files ?? {},
  };
  writeAllSessions(sessions);
}

export function saveFileViewState(
  bookPath: string,
  filePath: string,
  view: FileViewState,
): void {
  const sessions = readAllSessions();
  const existing = sessions[bookPath];
  sessions[bookPath] = {
    activePath: filePath,
    files: { ...(existing?.files ?? {}), [filePath]: view },
  };
  writeAllSessions(sessions);
}

export function renameFileInSession(
  bookPath: string,
  from: string,
  to: string,
): void {
  const session = loadBookEditorSession(bookPath);
  if (!session) return;
  const view = session.files[from];
  const files = { ...session.files };
  delete files[from];
  if (view) files[to] = view;
  saveBookEditorSession(bookPath, {
    activePath: session.activePath === from ? to : session.activePath,
    files,
  });
}

export function clampCaret(
  caret: { from: number; to: number },
  docLength: number,
): { from: number; to: number } {
  const from = Math.max(0, Math.min(caret.from, docLength));
  const to = Math.max(from, Math.min(caret.to, docLength));
  return { from, to };
}

export function loadLastBookPath(): string | null {
  try {
    const raw = localStorage.getItem(LAST_BOOK_STORAGE_KEY);
    return raw && raw.length > 0 ? raw : null;
  } catch {
    return null;
  }
}

export function saveLastBookPath(bookPath: string): void {
  localStorage.setItem(LAST_BOOK_STORAGE_KEY, bookPath);
}
