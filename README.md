# Inscriva

Book-first Markdown writing environment — web UI, local filesystem bridge, Git sync, and (Phase 2) scoped LLM assist.

Monorepo layout:

| Package / app | Role |
|---------------|------|
| `packages/web` | Svelte 5 + CodeMirror 6 editor |
| `packages/indexer` | Anchors, canon index, chapter pairing |
| `packages/bridge` | Shared `InscrivaBridge` types + HTTP / mock / Tauri clients |
| `apps/dev-bridge` | Node bridge for browser dev (`pnpm dev:bridge`) |
| `apps/desktop-macos` | Tauri 2 native shell (macOS today; same web `dist/` for future targets) |

Requirements: **Node 20+**, **pnpm 10+**. Native desktop builds also need **Rust** ([rustup](https://rustup.rs/)).

---

## Quick start (browser + dev bridge)

Best for day-to-day development on any OS:

```bash
pnpm install
```

**Terminal 1** — filesystem, Git, GitHub OAuth, API key storage:

```bash
pnpm dev:bridge
```

Copy `apps/dev-bridge/.env.example` → `apps/dev-bridge/.env` and set `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` if you use GitHub clone from the welcome screen.

**Terminal 2** — web UI:

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). Use **Open book** (paste a repo path or pick a folder), **Clone from GitHub**, or `?demo=1` for the in-browser mock book.

Or run both in one terminal:

```bash
pnpm dev:all
```

Optional env (web):

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_BRIDGE_URL` | `http://127.0.0.1:3847` | Dev bridge base URL |
| `VITE_FIXTURE_BOOK` | _(empty)_ | Default path on welcome screen |

Dev bridge env (`apps/dev-bridge/.env`):

| Variable | Default | Purpose |
|----------|---------|---------|
| `INSCRIVA_BRIDGE_PORT` | `3847` | HTTP + WebSocket port |
| `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` | — | GitHub OAuth |
| `GITHUB_OAUTH_REDIRECT` | `http://127.0.0.1:3847/git/oauth/github/callback` | Must match GitHub app settings |

---

## Tauri desktop (macOS)

The desktop app embeds the same web build and talks to the OS via Rust commands (no separate dev bridge process).

### Prerequisites

```bash
rustup update stable
pnpm install
```

GitHub OAuth for desktop: copy env into `apps/dev-bridge/.env` (loaded automatically) or `apps/desktop-macos/src-tauri/.env`. Register **both** callback URLs on your GitHub OAuth app if you use bridge and desktop:

- `http://127.0.0.1:3847/git/oauth/github/callback` (dev bridge)
- `http://127.0.0.1:3848/git/oauth/github/callback` (desktop default; override with `INSCRIVA_OAUTH_PORT`)

### Development

```bash
pnpm dev:desktop
```

This runs `vite` for `packages/web` and opens the Tauri window. The native layer provides:

- Folder picker, read/write book files, `notify` filesystem watch
- Git inspect / clone / pull / autosave (commit + push when possible)
- GitHub OAuth + clone from your repos (token in `~/.inscriva/oauth/github.json`, shared with dev bridge)
- API keys in macOS Keychain (`inscriva` service)
- Menu bar: **File** (Open, New, Pull, Close) and **View** (Draft / Revise / Read modes)

Keyboard shortcuts (macOS; `Cmd` → `Ctrl` on Windows/Linux when those targets are added):

| Shortcut | Action |
|----------|--------|
| `Cmd+O` | Open book folder |
| `Cmd+N` | New book (welcome) |
| `Cmd+Shift+P` | Pull from remote |
| `Cmd+W` | Close book |
| `Cmd+1` / `2` / `3` | Draft / Revise / Read mode |

### Production build

```bash
pnpm build:desktop
```

Output: `apps/desktop-macos/src-tauri/target/release/bundle/` (`.app` on macOS).

### Notarisation (macOS distribution)

Not automated in-repo. For distribution outside your machine:

1. Sign the app with a Developer ID certificate (`codesign`).
2. Notarise with `notarytool` and staple the ticket.
3. See [Apple’s notarisation docs](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution).

---

## Scripts (repo root)

| Script | Description |
|--------|-------------|
| `pnpm dev` | Web UI only (Vite) |
| `pnpm dev:bridge` | Dev bridge only |
| `pnpm dev:all` | Web + dev bridge in parallel |
| `pnpm dev:desktop` | Tauri dev (macOS shell) |
| `pnpm build` | Build all workspace packages |
| `pnpm build:web` | Production static build (`packages/web/dist`) |
| `pnpm build:desktop` | Web production build + Tauri bundle |
| `pnpm test` | Run Vitest across packages |
| `pnpm typecheck` | TypeScript check all packages |

---

## Deploy (Vercel — web UI)

Deploy the **static web UI** from `packages/web`. Do **not** point Vercel at `apps/dev-bridge` — that package is a local Node server, not the site build.

The repo includes `vercel.json` in three places so builds work whichever root Vercel uses:

| Root Directory (Vercel) | Config file used |
|-------------------------|------------------|
| *(empty — repo root)* | `/vercel.json` |
| `packages/web` **(recommended)** | `packages/web/vercel.json` |
| `apps/dev-bridge` *(misconfiguration)* | `apps/dev-bridge/vercel.json` (builds web anyway) |

Connect [github.com/Rillus/inscriva](https://github.com/Rillus/inscriva) in the Vercel dashboard.

### Recommended Vercel project settings

| Setting | Value |
|---------|--------|
| **Root Directory** | `packages/web` |
| Framework Preset | Other |
| Install / Build / Output | *(from `packages/web/vercel.json` — leave overrides empty)* |

Alternative: leave **Root Directory empty** and use the repo-root `vercel.json` (output staged to `/dist`).

### Troubleshooting

| Error | Fix |
|-------|-----|
| `Command "build:web" not found` or `Command "build:vercel" not found` | Wrong Root Directory — set to `packages/web` or clear it (repo root) |
| `No Output Directory named "dist" found` | Output Directory must be `dist`; redeploy after pulling latest |
| `Ignored build scripts: esbuild` | Root `package.json` lists `esbuild` under `pnpm.onlyBuiltDependencies` |
| Blank page after deploy | Open `/?demo=1` — real books need a bridge, not Vercel alone |

Optional environment variables (Project → Settings → Environment Variables):

| Variable | Purpose |
|----------|---------|
| `VITE_BRIDGE_URL` | Base URL of a running dev bridge if you host one separately |
| `VITE_FIXTURE_BOOK` | Default book path on the welcome screen |

A Vercel deployment is a **static UI** only: filesystem, Git, and OAuth need the [dev bridge](#quick-start-browser--dev-bridge) on your machine or the [Tauri desktop](#tauri-desktop-macos) app. Use `?demo=1` on the deployed URL for the in-browser mock book.

---

## Platform matrix

| Mode | Filesystem | Git | GitHub OAuth | API keys | Notes |
|------|------------|-----|--------------|----------|-------|
| **Browser + dev bridge** | Via HTTP/WS | Yes | Yes (port 3847) | `~/.inscriva/keys.json` | Recommended for dev |
| **Tauri desktop** | Native | Yes | Yes (port 3848 default) | macOS Keychain | No bridge process |
| **Browser demo** (`?demo=1`) | In-memory mock | No | No | No | UI/spike only |

Real writing expects a bridge (dev bridge or Tauri). See `docs/PRD.md` for the full roadmap.

---

## Tests

```bash
pnpm test
```

Anchor torture tests, bridge/indexer/unit tests, and dev-bridge Git helpers run under Vitest. Rust/Tauri code is compiled when you run `pnpm dev:desktop` or `pnpm build:desktop`.

---

## Docs

- [`docs/PRD.md`](docs/PRD.md) — product requirements and phased roadmap
- [`docs/commercialisation/README.md`](docs/commercialisation/README.md) — commercialisation hub (paid product PRD, implementation plan, epics)
- [`docs/Inscriva.md`](docs/Inscriva.md) — wiki index
- [`apps/desktop-macos/README.md`](apps/desktop-macos/README.md) — desktop-specific notes
