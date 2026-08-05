# LLM provider authentication (Phase 3)

Inscriva v1 uses **bring-your-own-key (BYOK)** API keys stored in the native secure store (Keychain, Android Keystore, dev-bridge env). Keys never live in the book Git repo.

## Vendor matrix

| Provider | v1 auth | Consumer subscription | OAuth for API |
|----------|---------|----------------------|---------------|
| OpenAI | API key | ChatGPT Plus ≠ API | Not offered for third-party apps |
| Anthropic | API key | Claude Pro ≠ API | Not offered for third-party apps |
| Google (Gemini) | API key | Gemini Advanced ≠ API | **Planned** — evaluate AI Studio / Vertex OAuth when stable for desktop/mobile PKCE |
| Custom (Ollama, etc.) | Optional key + base URL | N/A | N/A |

## Git OAuth (separate)

GitHub OAuth for **clone/pull/push** is implemented in the dev-bridge and Tauri shells — not for LLM inference.

## Implementation notes

- `packages/llm/src/provider-auth.ts` is the source of truth for Settings UI hints.
- When Google (or another vendor) ships a documented OAuth flow for API access with PKCE, add bridge methods `llmOAuthStart` / `llmOAuthComplete` mirroring `gitOAuthStart`.
- Until then, authors paste API keys in **Settings → LLM providers**.
