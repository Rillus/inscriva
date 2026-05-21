# Inscriva — desktop (Tauri 2)

Native shell for the shared web UI. See the [repo README](../../README.md) for setup, scripts, and the platform matrix.

## macOS only (for now)

```bash
pnpm dev:desktop    # from repo root
pnpm build:desktop  # release .app
```

Rust (`rustup`) is required. GitHub OAuth env vars: `apps/dev-bridge/.env` or `src-tauri/.env` (see `.env.example`).

Phase 3 will add Tauri Android; the same `packages/web` build is intended for all shells.
