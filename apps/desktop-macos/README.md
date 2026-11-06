# Inscriva — desktop (macOS)

Native shells for the shared web UI. See the [repo README](../../README.md) for setup, scripts, and the platform matrix.

## Tauri 2 (current default)

```bash
pnpm dev:desktop    # from repo root
pnpm build:desktop  # release .app
```

Rust (`rustup`) is required. GitHub OAuth env vars: `apps/dev-bridge/.env` or `src-tauri/.env` (see `.env.example`).

## Electron (in progress)

Thin Electron shell under `electron/` that loads the same `packages/web` build. Dev hits Vite at `http://localhost:5173`; packaged/prod loads `packages/web/dist`. Context isolation on; no Node in the renderer. Bridge port (git/keychain/llm) and signing/notarization are **not** in this slice — use the browser + `pnpm dev:bridge`, or keep using Tauri for native capabilities.

```bash
pnpm --filter @inscriva/web dev   # terminal 1
pnpm dev:electron                 # terminal 2 (from repo root)
```

After a web production build, run the shell against `dist/`:

```bash
pnpm build:electron
```

Unsigned only; do not expect Gatekeeper-clean installs yet.

If `electron` installs without a binary (common on bleeding-edge Node), re-run install under Node 22 (CI’s version) or unpack the cached `electron-v*-darwin-*.zip` into `node_modules/electron/dist` and write `path.txt` with `Electron.app/Contents/MacOS/Electron`. Unit tests do not need the binary.

Phase 3 adds Tauri Android (`apps/mobile-android`); the same `packages/web` build is intended for all shells.
