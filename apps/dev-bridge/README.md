# Dev bridge

Local HTTP + WebSocket server for browser development: filesystem, Git, GitHub OAuth, and LLM API key storage.

```bash
pnpm dev:bridge          # from repo root
# or
pnpm dev                 # in this package (via filter)
```

**Do not deploy this package to Vercel.** Vercel hosts the static web UI from the **repository root** (`packages/web/dist`). See [Deploy (Vercel)](../../README.md#deploy-vercel--web-ui) in the repo README.

If Vercel’s **Root Directory** is set to `apps/dev-bridge`, builds fail with `Command "build:web" not found` — clear Root Directory in Project → Settings → General.

For production-like remote hosting of the bridge, use a VPS, Railway, or Fly.io with persistent disk (not Vercel serverless).
