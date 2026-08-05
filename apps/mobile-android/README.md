# Inscriva — Android (Tauri 2)

Native Android shell for the shared web UI (`packages/web`). Uses the same bridge commands as the macOS app.

## Prerequisites

- [Rust](https://rustup.rs/) (stable)
- [Android Studio](https://developer.android.com/studio) with SDK, NDK, and platform tools
- `JAVA_HOME` pointing at a JDK 17+ install
- Tauri Android setup: `pnpm tauri android init` (once per machine) if the CLI prompts

## Commands

From the repo root:

```bash
pnpm dev:android    # Vite + Android emulator/device
pnpm build:android  # Release APK/AAB
```

GitHub OAuth env vars: copy `apps/dev-bridge/.env.example` or `src-tauri/.env.example`.

## Phase 3 scope

- [x] Scaffold app (`apps/mobile-android`) sharing Rust bridge with desktop
- [x] Books library path (`books_library_path`) for clone-without-picker
- [x] Sync on resume (web layer — pull + refresh when app returns to foreground)
- [x] Mobile chapter workspace + Assist panel layout
- [ ] Run `pnpm exec tauri android init` after Android Studio CLI tools are installed
- [ ] Device QA: folder picker, keystore API keys, Git on real hardware

See [docs/PRD.md](../../docs/PRD.md) for the full platform matrix.
