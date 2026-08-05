# Dev bridge

Local HTTP + WebSocket server for browser development: filesystem, Git, GitHub OAuth, and LLM API key storage.

```bash
pnpm dev:bridge          # from repo root
# or
pnpm dev                 # in this package (via filter)
```

**Do not deploy this package to Vercel** as your primary target — use **`packages/web`** as Root Directory instead. If Root Directory is accidentally set to `apps/dev-bridge`, this folder’s `vercel.json` will still build the web UI into `apps/dev-bridge/dist`.

For production-like remote hosting of the bridge, use a VPS, Railway, or Fly.io with persistent disk (not Vercel serverless).
