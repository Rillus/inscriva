# Inscriva — Product Requirements Document

**Product name (working):** Inscriva  
**Version:** PRD v0.4  
**Date:** 17 May 2026  
**Author:** Riley (with AI draft)  
**Project hub:** [[Inscriva]]

**Decisions locked:** web-first UI · sidecar-only anchors · one Git repo per book · all chapters treated equally · thin native shells for Mac/Android · **BYOK LLM** (bring your own API keys; no Inscriva-hosted inference in v1)

---

## 1. Executive summary

Inscriva is a **web-first, local-first, Markdown-native writing environment** for long-form fiction. The **product is a web application** (HTML/CSS/TypeScript): editor, canon panel, chapter focus, and line notes. **Mac and Android** ship the **same built web app** inside a thin **Tauri 2** shell that provides filesystem access, Git, and reliable background sync.

It behaves like Obsidian for navigation and editing, but is purpose-built for **book workflow**: canon context while you write, chapter intent always visible, notes anchored to paragraphs/sentences (sidecar-only—prose stays clean), quiet Git sync per book, and **scoped LLM assist** (draft, review, continuity) using **your own provider API keys**—OpenAI, Anthropic, Google Gemini, and others via a pluggable provider layer.

**One book = one Git repository.** Opening a repo opens that book. No multi-book vault. No special chapter types in the app—casebook, flashback, etc. are author labels in outline front matter only.

Reference book layout: [[01.72 Monsterosso/Monsterosso]] (`00 Canon/`, outlines, drafts, revision).

---

## 2. Platform strategy (web-first)

### 2.1 Build order

| Priority | Deliverable | Role |
|----------|-------------|------|
| **1** | **Web app** (`packages/web`) | All UI and most logic; runs in browser during development |
| **2** | **Native bridge** (`packages/bridge` + Tauri commands) | Git, read/write book repo, file watch, **secure API key storage**, **LLM request proxy** |
| **3** | **Mac shell** (`apps/desktop-macos`) | Wraps `dist/`; full feature set for primary writing |
| **4** | **Android shell** (`apps/mobile-android`) | Same `dist/`; companion read/notes, then full edit |

### 2.2 Capability model

The web app detects what the host provides:

```typescript
type Host = 'bridge' | 'browser';

// bridge = Tauri (Mac/Android) or future local dev server with FS/Git
// browser = static hosting or URL with no repo access → degraded mode
```

| Host | User can |
|------|----------|
| **`bridge`** | Open/clone book repo, edit files, autosync Git, offline index |
| **`browser` (no bridge)** | Demo UI, or connect via **Sync API** (Phase 3+, optional)—not MVP |

**MVP ships:** web app + Mac bridge. Android follows. Browser-only without bridge is **out of scope for v1** except as a dev preview with mocks.

### 2.3 Why not “web only” for v1

Local `.md` on disk, sidecar in repo, and non-intrusive Git need capabilities browsers do not expose consistently (folder access, background `git`, credentials). The **web UI is still the product**; shells are **capability adapters**, not a second codebase.

### 2.4 Architecture diagram

```
┌──────────────────────────────────────────────────────────┐
│  Web app (Vite + Svelte/React + CodeMirror 6)            │
│  Editor · Chapter panel · Canon · Notes · Assist panel   │
│  Indexer · Context builder (Session Pack) · LLM client   │
└─────────────────────────┬────────────────────────────────┘
                          │ inscrivaBridge.* (IPC)
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
   ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
   │ Tauri Mac   │ │Tauri Android│ │ Dev bridge  │
   │ git2 + fs   │ │ git2 + fs   │ │ (optional)  │
   │ secure keys │ │ secure keys │ │             │
   │ LLM proxy   │ │ LLM proxy   │ │             │
   └──────┬──────┘ └──────┬──────┘ └─────────────┘
          │               │
          ▼               ▼
     Book repo (Markdown + .inscriva/)  ←→  Git remote
```

**Indexer** may run in the web layer (pure JS on file contents returned by bridge) so behaviour is identical on all platforms.

---

## 3. Platform & feature matrix

**Legend**

| Symbol | Meaning |
|--------|---------|
| **●** | Full support (target experience) |
| **◐** | Partial — usable with limitations (see notes) |
| **○** | Requires native bridge (UI works; action needs shell) |
| **—** | Not planned for this platform tier |

### 3.1 Features by platform

| Feature | Web (dev, with bridge) | Web (browser only) | Mac app (Tauri) | Android app (Tauri) |
|---------|------------------------|--------------------|-----------------|---------------------|
| **Markdown editor** | ● | ● | ● | ● |
| **GFM + `[[wikilinks]]` + front matter** | ● | ● | ● | ● |
| **Draft / Revise / Read modes** | ● | ● | ● | ● (Revise: notes drawer, not gutter) |
| **File tree & chapter navigation** | ● | — | ● | ● |
| **One repo = one book** | ● | — | ● | ● |
| **Open existing local repo** | ● | — | ● | ◐ clone into app storage |
| **New book wizard** | ● | — | ● | ● |
| **Sidecar anchors (`.inscriva/anchors/`)** | ● | — | ● | ● |
| **Line notes (sidecar JSONL)** | ● | — | ● | ● |
| **Anchor reconciliation on edit** | ● | — | ● | ● |
| **Chapter ↔ outline pairing** | ● | — | ● | ● |
| **Chapter focus panel** | ● | — | ● | ◐ collapsible / bottom sheet |
| **Canon index & term hover** | ● | — | ● | ● |
| **`[[` autocomplete (canon bias)** | ● | — | ● | ● |
| **Revision pass UI (4a–4f)** | ● | — | ● | ◐ simplified checklist |
| **Git pull on book open** | ● | — | ● | ● |
| **Git autosave (idle commit + push)** | ● | — | ● | ◐ sync on resume + idle; OS may defer background |
| **Offline editing** | ● | — | ● | ● (local clone) |
| **File watch / live reindex** | ● | — | ● | ◐ on save + resume |
| **Split panes / multi-column** | ● | ◐ narrow only | ● | — single pane default |
| **Keyboard shortcuts** | ● | ● | ● (menu + ⌘) | ◐ external keyboard |
| **Session Pack / context export** | ● | ◐ copy only if no FS | ● | ● |
| **LLM assist (scoped tasks)** | ● | — | ● | ◐ smaller UI; same providers |
| **Provider API keys (BYOK)** | ○ secure store via bridge | — | ● Keychain | ● Keystore |
| **Auto-assembled context for LLM** | ● | — | ● | ● |
| **Streaming assist responses** | ● | — | ● | ● |
| **Apply AI edit (human approve)** | ● | — | ● | ● |
| **Clean `.md` (Obsidian round-trip)** | ● | — | ● | ● |
| **Installable / app icon** | — | ◐ PWA later | ● | ● |

### 3.2 Infrastructure & sync by platform

| Concern | Web + bridge | Browser only | Mac (Tauri) | Android (Tauri) |
|---------|--------------|--------------|-------------|-----------------|
| **Book files location** | User-chosen folder | N/A | User-chosen folder | App-private clone of repo |
| **Git implementation** | `libgit2` via Tauri | — | `libgit2` / `git2` | Same |
| **Git credentials** | OS store / `gh` | — | Keychain | Android Keystore |
| **LLM API keys** | Bridge secure store only | — | Keychain | Keystore |
| **LLM requests** | Via bridge proxy (keys not in web layer) | — | Same | Same |
| **Conflict handling** | Pause sync, notify once | — | Same | Same |
| **Background sync** | While app open | — | Idle + on quit | **Resume** + idle (do not rely on background alone) |
| **Second device open** | Optional `inscriva.lock` | — | ● | ● |

### 3.3 Architectural approaches (comparison)

| Approach | Description | Mac impact | Android | Fits Inscriva? |
|----------|-------------|------------|---------|----------------|
| **A. Web-first + Tauri shells** ✅ | Single `dist/`; bridge for FS/Git | `.app` wraps web build | Same APK | **Yes — chosen** |
| **B. Pure hosted web (SaaS)** | Repo on server; API for files/Git | Bookmark only | Browser | No — breaks local-first, Obsidian parity |
| **C. PWA only** | Installed site; OPFS / FS Access API | Add to Dock | Add to home screen | **Later optional** — weak Git/folder story |
| **D. Electron instead of Tauri** | Same as A, heavier runtime | Heavier `.app` | Possible | Fallback if Tauri mobile blocks |
| **E. Native UI (Swift/Kotlin)** | Separate UI per platform | Full rewrite ×2 | Full rewrite | No — conflicts with web-first |

**Mac build impact of web-first:** The Mac app is **not a separate product**. CI builds `packages/web` → copies `dist/` into Tauri → signs `.app`. Most features never touch Rust except bridge commands.

---

## 4. Problem statement

### 4.1 Pain today (Obsidian + AI workflow)

| Pain | Impact |
|------|--------|
| **Context switching** | Canon and outline not visible while drafting |
| **Chapter intent fades** | Goals live in separate files |
| **Notes don’t survive edits** | Line-number comments break when prose moves |
| **Revision passes are manual** | No in-editor nudge for pass status |
| **Sync is separate** | Manual Git; stale copies across devices |
| **AI context is manual** | Copy/paste Session Pack into ChatGPT; canon drops out; no tie to line notes |
| **AI edits are untracked** | Pasted prose bypasses outline scope and continuity checks |

### 4.2 What success looks like

- Open **Ch07** on **Mac or phone** → outline + canon visible; same repo after sync.
- Line notes survive paragraph moves (sidecar reconciliation).
- Edit session with **no sync modals**; conflicts rare and explicit.
- `.md` files open unchanged in Obsidian.
- **“Draft Scene 2 per outline”** sends the right canon + chapter scope automatically; you approve before text hits the draft file.
- **API keys** stay in Keychain/Keystore—never in the Git repo or Markdown.

---

## 5. Goals and non-goals

### 5.1 Goals

1. **Web-first codebase** — one UI for all platforms.
2. **Canon-aware writing** — surface and link canon while editing.
3. **Chapter focus** — goals and constraints always visible.
4. **Stable line notes** — sidecar anchors only.
5. **Git per book** — quiet sync via native bridge.
6. **Obsidian-compatible Markdown** — portable prose.
7. **Scoped LLM assist** — draft, review, and revision help with **bring-your-own-key** providers; human approves all prose changes.

### 5.2 Non-goals (v1)

- Browser-only production (no bridge) as primary product.
- Real-time multi-user co-editing.
- **Inscriva-billed inference** — no bundled tokens; you pay providers directly via your API accounts.
- **Autonomous book generation** — no “write the whole novella” command; tasks stay chapter/scene/paragraph-scoped.
- Replacing Obsidian for PKM.
- Hosted multi-tenant SaaS.
- Training on your manuscripts for a global model (no upload to Inscriva servers in v1).

---

## 6. Book model and repository

### 6.1 One repository per book

| Concept | Implementation |
|---------|----------------|
| **Book** | Git repo root: Markdown + `.inscriva/` |
| **Open book** | Bridge: pick folder or clone URL |
| **New book** | Wizard → template layout → `git init` → optional remote |
| **Switch book** | Close repo → open another (recents) |

Repo may live outside the Obsidian vault (e.g. `~/Writing/monterosso/`). See open questions for [[01.72 Monsterosso/Monsterosso]] migration.

### 6.2 Recommended layout (per book)

```
book-repo/
├── BookName.md                    # Hub
├── 00 Canon/
├── 01 Outlines/
│   ├── Master Outline.md
│   └── Chapter Outlines/
├── 02 Drafts/Chapters/
└── 03 Revision/
```

### 6.3 File roles & chapter pairing

| Role | Path pattern | Behaviour |
|------|--------------|-----------|
| Canon | `00 Canon/**` | Indexed, linked, hover |
| Outline | `01 Outlines/Chapter Outlines/Ch*.md` | Paired with draft |
| Draft | `02 Drafts/Chapters/Ch*.md` | Editor + anchors + notes |
| Revision | `03 Revision/**` | Pass checklist |

**All chapters identical in the app.** Outline `Mode:` fields are display-only metadata.

Default pair: `Ch01` prefix in outline + draft filenames → `.inscriva/chapter-map.json` for overrides.

---

## 7. Core features (platform-agnostic spec)

### 7.1 Editor

- Tree, fuzzy open, split panes (desktop), outline by headings, word count.
- Modes: **Draft** | **Revise** | **Read**.
- Mobile: single pane; notes in bottom sheet in Revise.

### 7.2 Chapter focus panel

From paired outline: story question, turn, scenes, Must include / NOT, word target, continuity hooks, status. Banner: one-line “turn by chapter end” in Draft mode.

### 7.3 Canon context engine

Index `00 Canon/`; aliases; wikilink graph. Inline hover, `[[` autocomplete, sidebar ranked by outline links + paragraph terms. Revise-mode soft warnings (Phase 2). No auto-rewrite.

### 7.4 Stable anchors & line notes (sidecar-only)

- IDs in `.inscriva/anchors/` only — **never** in `.md` body.
- Notes in `.inscriva/notes/notes.jsonl`.
- Reconcile on save: fingerprint match → fuzzy → orphan.
- Types: `comment`, `continuity`, `voice`, `plant`, `todo`, `ai`.

### 7.5 Revision passes

Structure, character, tone, continuity, line, read-aloud — mapped to UI assists; checklist sync to revision notes file.

### 7.6 Git sync (via bridge)

| Event | Action |
|-------|--------|
| Book open | `fetch` + fast-forward pull |
| Idle (~30s) | commit + push |
| Quit / background | flush |
| Push rejected | pull --rebase; on conflict → pause + notify |

`.inscriva/config.json`: `bookTitle`, `remote`, `branch`, `autosaveIdleSeconds`, etc.

### 7.7 LLM assist (BYOK)

Inscriva includes **first-class AI writing and review** tied to book structure—not a generic chat bolt-on. All inference uses **your API keys** for third-party providers; Inscriva does not resell tokens in v1.

#### 7.7.1 Principles

| Principle | Rule |
|-----------|------|
| **BYOK** | User adds API keys per provider in Settings; keys stored in OS secure store via bridge |
| **Scoped tasks** | Every request includes an explicit task type + bounded context (never “whole book” by default) |
| **Canon before creativity** | Context builder loads Style Guide, Character Bible, Continuity Log, and **current chapter outline** per book config—same rules as [[01.72 Monsterosso/Writing Plan - AI Novella Workflow]] |
| **Human in the loop** | AI output is **proposed** (diff/preview); user accepts, edits, or rejects before `writeFile` to draft `.md` |
| **Clean prose** | Accepted text writes to `.md` only; prompts and chat live in `.inscriva/` or ephemeral UI—not in chapter files |
| **Provider choice** | Per-task default model (e.g. fast model for continuity check, stronger for scene draft) |

#### 7.7.2 Providers (MVP and extensibility)

| Provider | Auth (v1) | Notes |
|----------|-----------|-------|
| **OpenAI** | API key | GPT-4o, o-series, etc.—user picks model ID in settings |
| **Anthropic** | API key | Claude 3.5/4 families |
| **Google** | API key | Gemini via Google AI Studio / Vertex key |
| **Custom** | API key + base URL | OpenAI-compatible endpoints (local LM Studio, etc.)—Phase 2 |

**Subscription vs API:** Consumer chat subscriptions (e.g. ChatGPT Plus, Claude Pro, Gemini Advanced) are **separate products** from API access in most cases. Inscriva v1 targets **API keys** from each provider’s developer console. OAuth or “sign in with Google/OpenAI” may be added later where providers support it for API access—documented as Phase 3, not MVP.

#### 7.7.3 Settings (app-level, not in book repo)

Stored in app secure storage + optional `~/.inscriva/settings.json` (no secrets):

- Provider name, masked key reference, default models per **task type**
- Optional: max tokens, temperature presets per task
- **Never** commit API keys to the book Git repo

#### 7.7.4 Context assembly (replaces manual Session Pack)

**Context builder** runs before each LLM call:

```
┌─────────────────────────────────────┐
│ Task template (system instructions) │
├─────────────────────────────────────┤
│ Book config: canon paths, taboos    │
├─────────────────────────────────────┤
│ Canon excerpts (token-budgeted)     │
│  · Style Guide                      │
│  · Character Bible (relevant cast)  │
│  · Continuity Log (facts + plants)  │
├─────────────────────────────────────┤
│ Chapter outline (paired, current)   │
├─────────────────────────────────────┤
│ Selection / scene / anchor quote    │
├─────────────────────────────────────┤
│ Draft excerpt (if reviewing)        │
└─────────────────────────────────────┘
```

- Token budget UI: show estimated size; trim by priority (outline > continuity > full bible).
- **“View context”** before send—transparent, editable for power users.
- Book-level overrides in `.inscriva/config.json`: which canon files, Session Pack template path, forbidden topics.

#### 7.7.5 Task types (aligned to writing workflow)

| Task ID | User trigger | Context focus | Output |
|---------|--------------|---------------|--------|
| `draft-scene` | Command palette / chapter panel | Outline scene card + canon | Prose block → preview → insert at cursor |
| `expand-outline` | From outline file | Master outline + continuity | Scene bullets → new outline section |
| `review-continuity` | Revise mode / line note | Continuity Log + Scene Ledger + selection | Issue list; optional patch per issue |
| `review-voice` | Revise pass 4c | Style Guide + paragraph | Suggestions; no auto-apply |
| `review-structure` | Pass 4a | Outline vs draft headings | Missing/extra beats |
| `fix-paragraph` | Line note type `ai` or selection | Anchor quote + canon | Replacement paragraph → diff |
| `brainstorm` | Hub / outline only | Monsterosso-style: bullets only | **Does not** write to draft without confirm |
| `explain-canon` | Hover / palette | Single canon note | Plain-language summary for author |

**Hard rule (enforced in UI):** `draft-scene` and `fix-paragraph` require an open paired chapter; `brainstorm` cannot target `02 Drafts/` without explicit confirm.

#### 7.7.6 Assist UI

- **Assist panel** (dock or slide-over): thread per task; streaming tokens; citations back to canon files (wikilink paths).
- **Inline:** select sentence → “Ask AI” pre-fills anchor + canon.
- **Diff view:** accept hunk / accept all / copy to clipboard.
- **Audit (optional):** `.inscriva/ai-log.jsonl` — task id, model, timestamp, files used—not full prompts by default (privacy toggle to log locally).

#### 7.7.7 Bridge: LLM proxy

API keys **must not** live in the web renderer. Tauri bridge exposes:

```typescript
llmComplete(request: LlmRequest): AsyncIterable<string>  // streaming
getProviders(): ProviderStatus[]                         // configured yes/no
setApiKey(provider: string, key: string): void             // → Keychain
clearApiKey(provider: string): void
```

Rust (or shell) performs HTTPS to provider; web sends structured `LlmRequest` only.

---

## 8. Repository layout (monorepo)

```
inscriva/                          # software repo (separate from Obsidian PRD folder)
├── apps/
│   ├── desktop-macos/             # Tauri
│   └── mobile-android/            # Tauri
├── packages/
│   ├── web/                       # UI — ship first
│   ├── bridge/                    # TS types + host detection
│   ├── indexer/                   # MD parse, anchors, canon
│   └── llm/                       # Provider adapters, prompts, context builder
└── package.json
```

---

## 9. AI workflow integration (summary)

| Feature | Purpose |
|---------|---------|
| **Context builder** | Auto Session Pack for every LLM task |
| **Assist panel** | Scoped draft/review/brainstorm with streaming |
| **Copy Session Pack** | Still available for external tools (Cursor, web chat) |
| **Export context bundle** | Zip canon + outline + excerpt |
| **Note → Ask AI** | Line note type `ai` opens task with anchor quote |
| **`inscriva/index.json`** | Glossary + chapter map (optional, for external agents) |

See **§7.7** for full LLM spec.

---

## 10. Security and privacy

- Book repos local; private Git remotes.
- **API keys:** OS secure store only (Keychain / Keystore); never in Git, never in `.md`, never sent to Inscriva servers.
- **LLM calls:** device → provider API directly (via bridge proxy); no mandatory Inscriva cloud relay in v1.
- Optional **local audit log** of task metadata; full prompt logging off by default.
- No telemetry in MVP.
- `.inscriva/` as sensitive as drafts (may contain ai-log, not keys).

---

## 11. Success metrics

| Metric | Target |
|--------|--------|
| Anchor survival after edit | >95% auto-reattach |
| Sync reliability | No silent loss; <1 manual conflict/month |
| Cold open chapter context | <3s with bridge |
| Obsidian round-trip | No broken rendering |
| Web/Mac parity | Same `dist/` hash in shell as dev build |
| LLM task success | User accepts ≥1 suggestion in >70% of assist sessions (qualitative beta) |

---

## 12. Phased roadmap (web-first)

### Phase 0 — Web spike (2 weeks) ✓

- [x] `packages/web`: CM6 editor, open mock chapter, responsive shell
- [x] `packages/indexer`: paragraph parse + sidecar read/write (disk via bridge; sentence-level deferred)
- [x] Bridge interface mocked in browser (`?demo=1`, `createMockBridge`)
- [x] 10 anchor torture tests (11 cases in `packages/indexer/src/anchors/torture.test.ts`)

### Phase 1 — Web MVP + Mac bridge (6–8 weeks) ✓

- [x] Bridge: FS read/write, watch, Git pull/push/autosave (`apps/dev-bridge`)
- [x] Bridge: secure key store (dev-bridge `~/.inscriva/keys.json`; Tauri Keychain commands)
- [ ] Bridge: key management **UI** (API wired; settings screen ships with Phase 2)
- [x] Web: tree, wikilinks, chapter pairing, chapter panel, canon hover
- [x] Web: line notes gutter (desktop layout; revise mode)
- [x] Web: welcome flow — open folder, GitHub OAuth clone, new book, recents
- [x] Dev without Tauri: local Node bridge (`pnpm dev:bridge`, port 3847)
- [x] Tauri Mac: wrap `dist/` (`frontendDist`, `beforeBuildCommand`)
- [x] Tauri Mac: menu + keyboard shortcuts (File / View; see README)
- [x] Tauri Mac: feature parity with dev-bridge (`notify` watch, GitHub OAuth, git push on autosave)
- [x] Notarisation: documented in README (manual release step; not CI-automated)

### Phase 2 — LLM assist + revision (5–7 weeks)

- [ ] `packages/llm`: OpenAI, Anthropic, Google adapters + context builder
- [ ] Bridge: LLM proxy (streaming), key management UI
- [ ] Assist panel: `draft-scene`, `fix-paragraph`, `review-continuity`, diff accept/reject
- [ ] Settings: BYOK per provider, default models per task type
- [ ] Revision pass modes + checklist; pass-specific review tasks
- [ ] Plant `P##` linking; soft warnings
- [ ] Session Pack export (for external tools) + “View context” before send

### Phase 3 — Android + expansions (4–6 weeks)

- [ ] Tauri Android: clone repo, mobile layout, sync on resume, Assist panel (◐)
- [ ] OpenAI-compatible custom base URL
- [ ] PWA / browser + Sync API (if needed)
- [ ] Read-only sharing
- [ ] Style Guide rule packs (deterministic + LLM)
- [ ] Provider OAuth where APIs support it (research per vendor)

---

## 13. Locked decisions

| Topic | Decision |
|-------|----------|
| **UI stack** | Web-first; shared `dist/` for all platforms |
| **Shells** | Tauri 2 for Mac + Android capability bridge |
| **Anchors** | Sidecar-only; clean Markdown |
| **Book boundary** | One Git repo per book |
| **Chapter types** | No app-level distinction |
| **Browser-only v1** | Not supported for real writing (bridge required) |
| **LLM billing** | BYOK API keys only; no Inscriva token resale in v1 |
| **AI edits** | Human approve before writing to draft `.md` |

---

## 14. Open questions

1. **Monterosso migration:** When to move to dedicated repo under `~/Writing/`?
2. **Git host:** GitHub private vs self-hosted; LFS for PDFs?
3. **New book template:** Skeleton only vs sample canon stubs?
4. ~~**Dev without Tauri:** Local Node bridge for `npm run dev` — worth building?~~ **Done** — `apps/dev-bridge`, `pnpm dev:bridge`.
5. **Scene Ledger:** Auto-suggest from headings (Phase 2+)?
6. **Default models:** Ship recommended model IDs per provider/task, or force user to choose?
7. **ai-log.jsonl:** Commit to book repo (team traceability) or gitignore (privacy)?
8. **Local models:** Ollama via OpenAI-compatible URL—Phase 2 or 3?

---

## 15. Appendices

### A — Example anchor sidecar

```json
{
  "file": "02 Drafts/Chapters/Ch01 - The Eighth A.md",
  "version": 3,
  "anchors": [
    {
      "id": "ch01:p:001:a3f9c2",
      "kind": "p",
      "fingerprint": "a3f9c2…",
      "preview": "The breakfast table in Appledore was never large enough…"
    }
  ]
}
```

### B — Bridge API (sketch)

```typescript
interface InscrivaBridge {
  openBook(path: string): Promise<BookHandle>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  watchBook(callback: (event: FileEvent) => void): Unsubscribe;
  gitPull(): Promise<void>;
  gitAutosave(message?: string): Promise<void>;
  gitStatus(): Promise<GitStatus>;
  // LLM (keys in secure store; requests proxied from native layer)
  setApiKey(provider: string, key: string): Promise<void>;
  clearApiKey(provider: string): Promise<void>;
  listProviders(): Promise<ProviderStatus[]>;
  llmStream(request: LlmRequest): AsyncIterable<string>;
}
```

### C — LLM request (sketch)

```typescript
interface LlmRequest {
  taskId: 'draft-scene' | 'fix-paragraph' | 'review-continuity' | /* … */;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  model: string;
  bookId: string;
  chapterKey?: string;       // e.g. Ch01
  anchorId?: string;
  selection?: { from: number; to: number };
  userMessage?: string;      // optional author instruction
  contextOverrides?: Partial<ContextBundle>;
}
```

### D — Reference workflow ([[01.72 Monsterosso/Writing Plan - AI Novella Workflow]])

| Stage | Inscriva support |
|-------|------------------|
| Canon lock | Canon index + context builder |
| Master outline | `expand-outline` task; graph (later) |
| Chapter outlines | Chapter panel + `expand-outline` |
| Draft | `draft-scene`, editor, diff apply |
| Revision passes | Pass modes + `review-*` tasks + notes |
| Assembly | Pandoc hook (later) |

| External session type (workflow doc) | Inscriva task |
|--------------------------------------|--------------|
| Expand outline | `expand-outline` |
| Draft prose | `draft-scene` |
| Fix continuity | `review-continuity` + `fix-paragraph` |
| Voice pass | `review-voice` |
| Brainstorm only | `brainstorm` (no draft write without confirm) |

---

## Related

- [[Inscriva]]
- [[commercialisation/README]] — commercial SaaS / licensing transition (separate PRD and delivery plan)
- [[01.72 Monsterosso/Monsterosso]]
- [[01.72 Monsterosso/Writing Plan - AI Novella Workflow]]
