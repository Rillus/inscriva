import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import { repoNameFromUrl, type LlmRequest } from "@inscriva/bridge";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import chokidar from "chokidar";
import Fastify from "fastify";
import simpleGit from "simple-git";
import { ensureNotesFile, readBookFileContent } from "./book-files.js";
import { BROWSER_CORS_METHODS, corsHeadersForOrigin } from "./cors-config.js";
import { cloneBookRepo, inspectBookRepo, pullBookRepo } from "./git.js";
import {
  cloneGithubRepo,
  completeGithubOAuth,
  disconnectGithub,
  githubOAuthConfigured,
  githubOAuthStatus,
  listGithubRepos,
  oauthErrorHtml,
  oauthSuccessHtml,
  startGithubOAuth,
} from "./github-oauth.js";
import { loadBookFilesMap } from "./book-files-map.js";
import { renameBookFile } from "./rename-book-file.js";
import {
  formatSseChunk,
  previewContext,
  sessionPackMarkdown,
  streamLlmResponse,
} from "./llm-route.js";
import {
  clearLlmKeyInFile,
  loadLlmKeys,
  setLlmKeyInFile,
} from "./llm-keys.js";
import { nativeDialogSupported, pickDirectory } from "./native-dialog.js";

const PORT = Number(process.env.INSCRIVA_BRIDGE_PORT ?? 3847);
const RECENTS_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".inscriva",
  "recents.json",
);
const KEYS_PATH = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".inscriva",
  "keys.json",
);

let bookRoot: string | null = null;
let watcher: chokidar.FSWatcher | null = null;
const wsClients = new Set<{ send: (data: string) => void }>();

const app = Fastify({ logger: false });

await app.register(cors, {
  origin: true,
  methods: [...BROWSER_CORS_METHODS],
});
await app.register(websocket);

app.get("/health", async () => ({ ok: true }));

app.get("/capabilities", async () => ({
  folderPicker: nativeDialogSupported(),
  gitClone: true,
  gitPull: true,
  gitInspect: true,
  gitOAuth: githubOAuthConfigured(),
}));

app.post<{ Body: { path: string } }>("/book/open", async (req) => {
  const root = path.resolve(req.body.path);
  await fs.access(root);
  bookRoot = root;
  await ensureNotesFile(root);
  await startWatcher(root);
  await addRecent(root);
  const title = await readBookTitle(root);
  return { id: root, path: root, title };
});

app.post("/book/pick", async (req) => {
  const body = req.body as { prompt?: string } | undefined;
  if (!nativeDialogSupported()) {
    return { path: null, error: "Folder picker not supported on this platform" };
  }
  const chosen = await pickDirectory(
    body?.prompt ?? "Select your book folder",
  );
  return { path: chosen };
});

app.post<{ Body: { path: string } }>("/git/inspect", async (req) => {
  return inspectBookRepo(req.body.path);
});

app.get("/git/github/oauth/start", async () => startGithubOAuth(PORT));

app.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
  "/git/oauth/github/callback",
  async (req, reply) => {
    if (req.query.error) {
      return reply
        .type("text/html")
        .send(oauthErrorHtml(req.query.error));
    }
    const { code, state } = req.query;
    if (!code || !state) {
      return reply.type("text/html").send(oauthErrorHtml("Missing code or state"));
    }
    try {
      const { username } = await completeGithubOAuth(code, state);
      broadcast({ type: "github-connected", username });
      return reply.type("text/html").send(oauthSuccessHtml(username));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.type("text/html").send(oauthErrorHtml(message));
    }
  },
);

app.get("/git/github/status", async () => githubOAuthStatus());

app.delete("/git/github/disconnect", async () => {
  await disconnectGithub();
  return { ok: true };
});

app.get("/git/github/repos", async () => {
  const repos = await listGithubRepos();
  return { repos };
});

app.post<{ Body: { fullName: string; parentPath: string } }>(
  "/git/github/clone",
  async (req) => {
    const { fullName, parentPath } = req.body;
    const target = await cloneGithubRepo(fullName, parentPath);
  bookRoot = target;
  await ensureNotesFile(target);
  await startWatcher(target);
  await addRecent(target);
  const title = await readBookTitle(target);
  return { id: target, path: target, title };
  },
);

app.post<{ Body: { url: string; parentPath: string } }>("/git/clone", async (req) => {
  const { url, parentPath } = req.body;
  const folderName = repoNameFromUrl(url);
  const target = await cloneBookRepo(url, parentPath, folderName);
  bookRoot = target;
  await ensureNotesFile(target);
  await startWatcher(target);
  await addRecent(target);
  const title = await readBookTitle(target);
  return { id: target, path: target, title };
});

app.get("/book/files", async () => {
  requireBook();
  const files = await listFilesRecursive(bookRoot!);
  return { files };
});

app.get<{ Querystring: { path: string } }>("/book/file", async (req) => {
  requireBook();
  const rel = req.query.path;
  const full = safePath(bookRoot!, rel);
  const content = await readBookFileContent(full);
  return { content };
});

app.put<{ Body: { path: string; content: string } }>("/book/file", async (req) => {
  requireBook();
  const full = safePath(bookRoot!, req.body.path);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, req.body.content, "utf-8");
  broadcast({ path: req.body.path, kind: "modified" });
  return { ok: true };
});

app.post<{ Body: { from: string; to: string } }>("/book/file/rename", async (req) => {
  requireBook();
  const { from, to } = req.body;
  await renameBookFile(bookRoot!, from, to, safePath);
  broadcast({ path: to, kind: "modified" });
  return { ok: true };
});

app.post<{ Body: NewBookBody }>("/book/create", async (req) => {
  const { title, path: bookPath, initGit = true } = req.body;
  const root = path.resolve(bookPath);
  await createBookLayout(root, title);
  if (initGit) {
    const git = simpleGit(root);
    await git.init();
  }
  bookRoot = root;
  await startWatcher(root);
  await addRecent(root);
  return { id: root, path: root, title };
});

app.get("/recents", async () => ({ recents: await loadRecents() }));

app.post<{ Body: { path: string } }>("/recents", async (req) => {
  await addRecent(req.body.path);
  return { ok: true };
});

app.post("/git/pull", async () => {
  requireBook();
  try {
    return await pullBookRepo(bookRoot!);
  } catch (err) {
    return {
      pulled: false,
      skipped: err instanceof Error ? err.message : "pull failed",
    };
  }
});

app.post<{ Body: { message?: string } }>("/git/autosave", async (req) => {
  requireBook();
  const git = simpleGit(bookRoot!);
  const status = await git.status();
  if (status.files.length === 0) return { ok: true, skipped: true };

  await git.add(".");
  await git.commit(
    req.body.message ?? `Inscriva autosave ${new Date().toISOString()}`,
  );
  try {
    await git.push();
  } catch {
    /* no remote configured */
  }
  return { ok: true };
});

app.get("/git/status", async () => {
  if (!bookRoot) {
    return { ahead: 0, behind: 0, dirty: false };
  }
  const git = simpleGit(bookRoot);
  const status = await git.status();
  let ahead = 0;
  let behind = 0;
  try {
    const summary = await git.raw(["rev-list", "--left-right", "--count", "HEAD...@{u}"]);
    const parts = summary.trim().split(/\s+/);
    behind = Number(parts[0] ?? 0);
    ahead = Number(parts[1] ?? 0);
  } catch {
    /* no upstream */
  }
  return {
    ahead,
    behind,
    dirty: !status.isClean(),
  };
});

app.get("/keys", async () => {
  const keys = await loadKeys();
  const providers = ["openai", "anthropic", "google"].map((provider) => ({
    provider,
    configured: Boolean(keys[provider]),
  }));
  return { providers };
});

app.put<{ Body: { provider: string; key: string } }>("/keys", async (req) => {
  await setLlmKeyInFile(KEYS_PATH, req.body.provider, req.body.key);
  return { ok: true };
});

app.delete<{ Params: { provider: string } }>("/keys/:provider", async (req) => {
  await clearLlmKeyInFile(KEYS_PATH, req.params.provider);
  return { ok: true };
});

app.post<{ Body: LlmRequest }>("/llm/preview", async (req) => {
  requireBook();
  const files = await loadBookFilesMap(bookRoot!, listFilesRecursive, safePath);
  return { context: previewContext(req.body, files) };
});

app.post<{ Body: LlmRequest }>("/llm/session-pack", async (req) => {
  requireBook();
  const files = await loadBookFilesMap(bookRoot!, listFilesRecursive, safePath);
  const title = await readBookTitle(bookRoot!);
  return { markdown: sessionPackMarkdown(req.body, files, title) };
});

app.post<{ Body: LlmRequest }>("/llm/stream", async (req, reply) => {
  requireBook();
  const request = req.body;
  const keys = await loadKeys();
  const apiKey = keys[request.provider];
  if (!apiKey) {
    return reply
      .code(400)
      .send({ error: `No API key configured for ${request.provider}` });
  }

  const files = await loadBookFilesMap(bookRoot!, listFilesRecursive, safePath);

  reply.hijack();
  reply.raw.writeHead(200, {
    ...corsHeadersForOrigin(req.headers.origin),
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  try {
    for await (const chunk of streamLlmResponse(request, files, apiKey)) {
      reply.raw.write(chunk);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    reply.raw.write(formatSseChunk({ error: message }));
    reply.raw.write("data: [DONE]\n\n");
  }

  reply.raw.end();
});

app.register(async (fastify) => {
  fastify.get("/watch", { websocket: true }, (socket) => {
    const client = {
      send: (data: string) => {
        if (socket.readyState === 1) socket.send(data);
      },
    };
    wsClients.add(client);
    socket.on("close", () => wsClients.delete(client));
  });
});

try {
  await app.listen({ port: PORT, host: "127.0.0.1" });
  console.log(`Inscriva dev bridge listening on http://127.0.0.1:${PORT}`);
} catch (err) {
  const code = err && typeof err === "object" && "code" in err ? err.code : null;
  if (code === "EADDRINUSE") {
    console.error(
      `\nPort ${PORT} is already in use (another dev-bridge is probably still running).\n\n` +
        `  Stop it:  pnpm dev:bridge:stop\n` +
        `  Or use:   INSCRIVA_BRIDGE_PORT=3848 pnpm dev:bridge\n`,
    );
    process.exit(1);
  }
  throw err;
}

interface NewBookBody {
  title: string;
  path: string;
  initGit?: boolean;
}

function requireBook(): asserts bookRoot is string {
  if (!bookRoot) throw new Error("No book open");
}

function safePath(root: string, rel: string): string {
  const full = path.resolve(root, rel);
  if (!full.startsWith(path.resolve(root))) {
    throw new Error("Path escapes book root");
  }
  return full;
}

async function listFilesRecursive(dir: string, base = ""): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.name === ".git") continue;
    const rel = base ? `${base}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listFilesRecursive(full, rel)));
    } else {
      files.push(rel);
    }
  }

  return files;
}

async function readBookTitle(root: string): Promise<string> {
  try {
    const configPath = path.join(root, ".inscriva", "config.json");
    const raw = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(raw) as { bookTitle?: string };
    if (config.bookTitle) return config.bookTitle;
  } catch {
    /* fall through */
  }
  return path.basename(root);
}

async function createBookLayout(root: string, title: string): Promise<void> {
  const dirs = [
    "00 Canon",
    "01 Outlines/Chapter Outlines",
    "02 Drafts/Chapters",
    "03 Revision",
    ".inscriva/anchors",
    ".inscriva/notes",
  ];

  for (const dir of dirs) {
    await fs.mkdir(path.join(root, dir), { recursive: true });
  }

  const hub = `# ${title}\n\nBook hub — link outlines, drafts, and canon here.\n`;
  await fs.writeFile(path.join(root, `${title}.md`), hub, "utf-8");

  await fs.writeFile(
    path.join(root, ".inscriva", "config.json"),
    JSON.stringify(
      {
        bookTitle: title,
        branch: "main",
        autosaveIdleSeconds: 30,
      },
      null,
      2,
    ),
    "utf-8",
  );

  await fs.writeFile(
    path.join(root, ".inscriva", "notes", "notes.jsonl"),
    "",
    "utf-8",
  );

  await fs.writeFile(
    path.join(root, "01 Outlines", "Master Outline.md"),
    `# Master Outline\n`,
    "utf-8",
  );
}

async function startWatcher(root: string): Promise<void> {
  if (watcher) await watcher.close();
  watcher = chokidar.watch(root, {
    ignored: /(^|[/\\])\../,
    ignoreInitial: true,
  });

  watcher.on("all", (event, filePath) => {
    const rel = path.relative(root, filePath).split(path.sep).join("/");
    const kind =
      event === "add" ? "created" : event === "unlink" ? "deleted" : "modified";
    broadcast({ path: rel, kind });
  });
}

function broadcast(event: Record<string, unknown>): void {
  const payload = JSON.stringify(event);
  for (const client of wsClients) {
    client.send(payload);
  }
}

async function loadRecents(): Promise<string[]> {
  try {
    const raw = await fs.readFile(RECENTS_PATH, "utf-8");
    return JSON.parse(raw) as string[];
  } catch {
    return [];
  }
}

async function addRecent(bookPath: string): Promise<void> {
  const recents = (await loadRecents()).filter((p) => p !== bookPath);
  recents.unshift(bookPath);
  await fs.mkdir(path.dirname(RECENTS_PATH), { recursive: true });
  await fs.writeFile(
    RECENTS_PATH,
    JSON.stringify(recents.slice(0, 10), null, 2),
    "utf-8",
  );
}

async function loadKeys(): Promise<Record<string, string>> {
  return loadLlmKeys(KEYS_PATH);
}
