# Inscriva — Product Requirements Document

**Product name (working):** Inscriva  
**Version:** PRD v0.6  
**Date:** 21 May 2026  
**Author:** Riley (with AI draft)  
**Project hub:** [[Inscriva]]

**Decisions locked:** web-first UI · sidecar-only anchors · one Git repo per book · all chapters treated equally · thin native shells for Mac/Android · **BYOK LLM** (bring your own API keys; no Inscriva-hosted inference in v1) · **chapter-first workspace** (files remain source of truth; file tree optional) · **AI opt-in only** (recommendations may suggest when to invoke AI; never auto-call providers)

---

## 1. Executive summary

Inscriva is a **web-first, local-first, Markdown-native writing environment** for long-form fiction. The **product is a web application** (HTML/CSS/TypeScript): editor, canon panel, chapter focus, and line notes. **Mac and Android** ship the **same built web app** inside a thin **Tauri 2** shell that provides filesystem access, Git, and reliable background sync.

It behaves like Obsidian for navigation and editing, but is purpose-built for **book workflow**: **chapter as the primary unit** (paired outline + draft + alignment in one workspace), canon context while you write, structure kept honest via **deterministic checks** plus **opt-in** scoped LLM assist, notes anchored to paragraphs/sentences (sidecar-only—prose stays clean), quiet Git sync per book, and **cast intelligence** (character appearances, dialogue concordance) derived from the repo index.

**AI is never contacted without an explicit user action.** The app may **recommend** moments to consider AI (e.g. draft reached outline word target, editing an outline while a draft exists, stale alignment report)—always as dismissible, non-blocking UI, never as background inference.

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
│  Chapter workspace · Editor · Cast · Alignment · Notes   │
│  Indexer · Book index · Recommendations · LLM (opt-in)   │
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
| **Chapter workspace (outline + draft + alignment)** | ◐ | — | ● | ◐ |
| **Chapter board / status rail** | — | — | ● | ◐ |
| **Deterministic alignment report** | ◐ | — | ● | ◐ |
| **Cast index & character sheet** | — | — | ● | ◐ |
| **AI recommendations (no auto-call)** | — | — | ● | ◐ |
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
| **File-first UI** | Outline and draft feel disconnected; hard to see if chapter goals are met |
| **Character knowledge scattered** | Bible, drafts, and Scene Ledger must be searched manually for “who said what” |
| **AI over-eager or absent** | Either manual Session Pack for every check, or tools that call models without clear scope |

### 4.2 What success looks like

- Open **Ch07** in **chapter workspace** → outline, draft, alignment status, and cast for this chapter visible together; file tree available but not required.
- Line notes survive paragraph moves (sidecar reconciliation).
- Edit session with **no sync modals**; conflicts rare and explicit.
- `.md` files open unchanged in Obsidian.
- **“Draft Scene 2 per outline”** sends the right canon + chapter scope automatically; you approve before text hits the draft file.
- **“Check chapter against outline”** runs deterministic checks instantly; AI course-correction runs only when you click **Run AI review**.
- **Click “Cole”** → appearances across chapters, dialogue snippets, bible entry—jump to any mention in draft.
- **Recommendations** (e.g. “Draft within 10% of word target—consider alignment check”) appear as hints; **no LLM call** until you confirm.
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
8. **Chapter-first structure** — navigation and health checks centred on paired chapters, not loose files.
9. **Deterministic structure health** — word targets, plants, scene headings, must-include heuristics without spending tokens.
10. **Opt-in AI with recommendations** — suggest when AI may help; never invoke providers in the background.

### 5.2 Non-goals (v1)

- Browser-only production (no bridge) as primary product.
- Real-time multi-user co-editing.
- **Inscriva-billed inference** — no bundled tokens; you pay providers directly via your API accounts.
- **Autonomous book generation** — no “write the whole novella” command; tasks stay chapter/scene/paragraph-scoped.
- Replacing Obsidian for PKM.
- Hosted multi-tenant SaaS.
- Training on your manuscripts for a global model (no upload to Inscriva servers in v1).
- **Background / ambient AI** — no idle polling of providers, no auto-summarise on save, no “copilot” that streams without a user gesture.
- **Replacing canon files with a proprietary character database** — cast index is derived from Markdown; bible remains authoritative.

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
| Outline | `01 Outlines/Chapter Outlines/*.md` | Paired with draft; parsed for scenes/goals |
| Draft | `02 Drafts/Chapters/*.md` | Editor + anchors + notes |
| Revision | `03 Revision/**` | Pass checklist, Scene Ledger, **author-facing reports** (alignment, writing log) |
| Book index (cache) | `.inscriva/index.json` | Rebuilt on watch; chapters, cast, alignment metadata (see §7.9) — technical cache, not primary UI |
| Alignment reports | `.inscriva/reports/` + **`03 Revision/Alignment/`** | JSON cache in `.inscriva/`; human-readable `.md` in file tree (see §7.9) |
| Writing sessions | `.inscriva/writing-sessions.jsonl` + **`03 Revision/Writing log.md`** | Machine log + author-facing discipline log (see §7.12) |

**All chapters identical in the app.** Outline `Mode:` fields are display-only metadata.

**Chapter pairing keys** (first match wins; then `chapter-map.json` overrides):

| Pattern | Example | Key |
|---------|---------|-----|
| `ChNN` in filename | `Ch01 - The Eighth A.md` | `Ch01` |
| `ChNN` in outline H1 | `# Ch01: The Cabbages…` | `Ch01` |
| Numeric prefix | `01 - The Cabbages at Breakfast.md` | `Ch01` (normalise `01` → `Ch01`) |

Reference: [[01.72 Monsterosso/Monsterosso]] uses numeric filenames with `ChNN` in outline titles—pairing must support this without forcing renames.

**Outline dialects:** Parser supports at least (a) **template** sections (`## Story question`, `## Scenes` bullets, `## Turn`) and (b) **Monsterosso** sections (`## Turn by chapter end`, `## Scene N — Title` with per-scene Goal/Conflict/Outcome/Must include/Must NOT). Same chapter focus model feeds UI and context builder.

---

## 7. Core features (platform-agnostic spec)

### 7.1 Editor & navigation modes

**Primary navigation: chapter workspace** (see §7.8). **Secondary: file tree** — kept as optional drawer/tab (fuzzy open, canon edits, Master Outline, hub).

- Split panes (desktop): draft | outline | alignment within workspace.
- Modes: **Draft** | **Revise** | **Read**.
- Mobile: chapter workspace stacks panes; file tree in menu; notes in bottom sheet in Revise.
- Scene navigator (draft): jump between outline scenes; grey state when draft has no matching scene heading.

### 7.2 Chapter focus panel

From paired outline (both dialects): story question, turn, scenes, Must include / NOT (chapter-level and per-scene where parsed), word target, continuity hooks, status. Banner: one-line turn in Draft mode. **Goal checklist:** must-include items as checkboxes—auto-ticked by deterministic matchers where possible; manual override always available (no AI required).

### 7.3 Canon context engine

Index `00 Canon/`; aliases; wikilink graph. Inline hover, `[[` autocomplete, sidebar ranked by outline links + paragraph terms. Revise-mode soft warnings (Phase 2). No auto-rewrite.

### 7.4 Stable anchors & line notes (sidecar-only)

- IDs in `.inscriva/anchors/` only — **never** in `.md` body.
- Notes in `.inscriva/notes/notes.jsonl`.
- Reconcile on save: fingerprint match → fuzzy → orphan.
- Types: `comment`, `continuity`, `voice`, `plant`, `todo`, `ai`.

### 7.5 Revision passes

Structure, character, tone, continuity, line, read-aloud — mapped to UI assists; checklist sync to revision notes file.

**Structure pass** integrates **deterministic alignment** (§7.9) first; AI `review-chapter-goals` offered as optional second step via recommendation or explicit **Run AI review**—never automatic.

### 7.6 Git sync (via bridge)

| Event | Action |
|-------|--------|
| Book open | `fetch` + fast-forward pull |
| Idle (~30s) | commit + push |
| Quit / background | flush |
| Push rejected | pull --rebase; on conflict → pause + notify |

`.inscriva/config.json`: `bookTitle`, `remote`, `branch`, `autosaveIdleSeconds`, `recommendations` (thresholds, per-rule toggles), `alignmentExportPath`, `castGeneratedPath`, canon path overrides, etc.

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
| **Opt-in only** | **No** LLM HTTP request without explicit user action (button, command palette, confirmed recommendation). Saving files, indexing, Git, and deterministic reports do **not** call providers. |
| **Recommendations ≠ inference** | UI may suggest tasks (see §7.11); suggestions are local heuristics only until user confirms. |

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
| `review-structure` | Pass 4a / alignment tab | Outline vs draft headings | Missing/extra beats (deterministic pre-check may run first) |
| `review-chapter-goals` | Chapter workspace → **Run AI review**; confirmed recommendation | Full outline + full draft + canon + Scene Ledger | Structured report: per-scene goal met/partial/missing, turn, must NOT violations, quotes; **no auto-apply** |
| `refresh-outline-from-draft` | Chapter workspace; confirmed recommendation | Draft + current outline | Proposed outline patches (scene outcomes, continuity hooks, status)—accept per section |
| `summarise-character-arc` | Character sheet | Bible + mention snippets across drafts | Author-facing arc summary; does not edit bible without confirm |
| `fix-paragraph` | Line note type `ai` or selection | Anchor quote + canon | Replacement paragraph → diff |
| `brainstorm` | Hub / outline only | Monsterosso-style: bullets only | **Does not** write to draft without confirm |
| `explain-canon` | Hover / palette / character sheet | Single canon note | Plain-language summary for author |

**Hard rules (enforced in UI):**

- `draft-scene` and `fix-paragraph` require an open paired chapter.
- `brainstorm` cannot target `02 Drafts/` without explicit confirm.
- All `review-*` and `refresh-outline-from-draft` tasks require user initiation; recommendations must show **Run** / **Dismiss** / **Don’t ask again for this chapter**.

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

### 7.8 Chapter-first workspace

**Primary object:** a **chapter** (paired outline + draft + derived metadata), not a single file path.

#### 7.8.1 Chapter rail / board

- List all chapters from book index: key, title, status (from outline `## Status` / front matter), word count vs target, alignment summary (ok / warnings / stale / not run).
- **Drift badges** on row: e.g. unlinked plants, outline/draft word-count band, “alignment not run since last edit”.
- Click chapter → open **chapter workspace** (does not require using file tree).
- Optional **board view:** columns by status (Outlined → Drafting → Aligned → Locked)—labels from author outline, not app-enforced chapter types.

#### 7.8.2 Chapter workspace layout (desktop)

| Pane / tab | Content |
|------------|---------|
| **Draft** | Chapter prose editor (existing CM6 + canon hover + Write with AI) |
| **Outline** | Paired outline—editable in place; wikilinks to canon |
| **Alignment** | Deterministic report + saved AI reports + actions (see §7.9) |
| **Cast** | Characters detected in this chapter (from cast index); click → character sheet |

Opening any paired file from the file tree should switch the workspace to that chapter (same shell), not an isolated single-file mode.

#### 7.8.3 Outline ↔ draft coupling in UI

- Always load **both** outline and draft when a chapter is selected.
- Editing outline while draft exists: show **read-only draft excerpt** or word-count strip in outline pane; enable recommendation **Compare outline to draft** (§7.11).
- Editing draft: chapter focus panel + scene navigator reflect parsed outline; plant banner (existing) remains deterministic.

#### 7.8.4 File tree (retained)

- Available as **Files** view via a **toggle** from chapter view (same shell; not a separate app mode).
- **Default:** chapter view (rail + workspace). File tree is secondary.
- User preference (app settings): `navigationDefault` = `chapter` | `files` | `last used` (default **`chapter`**).

### 7.9 Alignment & structure health

**Intent:** Answer “are we on course for this chapter’s goals?” with **deterministic checks first**, **AI interpretation second** (opt-in).

#### 7.9.1 Deterministic alignment (no LLM)

Rebuilt on index pass and on demand when user opens Alignment tab or clicks **Refresh checks**:

| Check | Source | Output |
|-------|--------|--------|
| Word count | Draft vs outline target (range or single) | ok / under / over (default band **90–110%**, locked) |
| Plants | Outline continuity vs draft (`findUnlinkedPlants`) | List missing `P##` |
| Scene headings | Outline `## Scene N` vs draft headings | Matched / missing / extra |
| Must include | Outline bullets vs draft (keyword/heuristic per item) | Per-item hit / miss / uncertain |
| Must NOT | Forbidden terms/phrases in draft | Violation list |
| Turn | Optional heuristic (e.g. keywords near chapter end)—low confidence, flagged as heuristic only | hint only |

On **Refresh checks**, the app writes:

1. **Cache:** `.inscriva/reports/{chapterKey}-alignment.json` (machine-readable; technical — not promoted in the file tree).
2. **Author-facing report:** `03 Revision/Alignment/{chapterKey}.md` (always written when checks run — visible in the file tree for reading in Inscriva or Obsidian).

`.inscriva/` holds organisation and implementation detail the author does not need day to day; **consumable outputs** (alignment reports, writing log, Scene Ledger, revision notes) live under normal book folders.

#### 7.9.2 AI chapter goals review (`review-chapter-goals`)

- **Trigger:** user only—**Run AI review** in Alignment tab, Revision Structure pass, or confirmed recommendation.
- **Input:** paired outline + full draft + token-budgeted canon + Scene Ledger + deterministic report (so model and UI share facts).
- **Output:** structured JSON rendered as report sections—not silent edits:
  - Per scene: goal / conflict / outcome assessment with draft citations
  - Story question and turn: met / partial / undermined
  - Suggested outline updates (optional follow-up via `refresh-outline-from-draft`)
- User may save AI report snapshot to `03 Revision/Alignment/` (and optional JSON cache under `.inscriva/reports/`).

#### 7.9.3 Outline refresh from draft (`refresh-outline-from-draft`)

- **Direction:** draft → outline (convergence after writing).
- **Opt-in AI** proposes patches to scene Outcomes, continuity hooks, Status—**per-section accept**.
- **No auto-write** to outline file without accept.
- Deterministic-only alternative (Phase 2+): tick scene checkboxes and update Status manually from alignment UI without AI.

### 7.10 Cast index & character sheet

**Intent:** Click a character name → full picture across the book so far—without maintaining a separate database.

#### 7.10.1 Cast index (derived)

Built from:

1. **Character Bible** — parse `### Name` sections (and tables) from `00 Canon/**` bible file(s); aliases from “also known as” and common nicknames (e.g. Cole / Agricole).
2. **Draft scan** — all `02 Drafts/Chapters/*.md` for name/alias mentions at paragraph granularity (reuse anchor offsets where possible).
3. **Dialogue extraction (heuristic)** — quoted speech and attribution patterns (`"…" said Cole`, em-dash dialogue); uncertain lines flagged, optional AI cleanup later (opt-in).

Stored in `.inscriva/index.json` under `characters[]` (paths, mention ranges, chapter keys)—rebuilt on file watch.

#### 7.10.2 Character sheet UI

Opened from: draft click on recognised name, Cast tab in chapter workspace, canon hover **Open sheet**, command palette.

| Section | Content |
|---------|---------|
| **Bible** | Canon excerpt + link to source file |
| **Appearances** | Table: chapter, scenes, word count in chapter, first/last mention |
| **Mentions** | Snippet list with jump-to-draft |
| **Dialogue** | Aggregated quotes (heuristic) with chapter links |
| **Drift** | Deterministic: bible fact vs conflicting mention (where rules exist); AI optional via `summarise-character-arc` |

Optional **generated markdown** (book config): `00 Canon/Character Bible/_generated/{Name} - appearances.md`—gitignored or committed per author preference (open question).

### 7.11 AI recommendations (when to consider LLM)

Recommendations are **local, rule-based nudges**—they do **not** call providers. Each shows: short reason, suggested task, **Run**, **Dismiss**, optional **Don’t ask again** (per chapter or globally per rule id).

| Rule ID | Condition (examples) | Suggested task |
|---------|----------------------|----------------|
| `word-target-near` | Draft word count within **90–110%** of outline target (locked default band) | `review-chapter-goals` or deterministic **Refresh checks** only |
| `word-target-over` | Draft exceeds outline max | Deterministic refresh + optional `review-chapter-goals` |
| `outline-while-draft-exists` | User focuses Outline tab and chapter has draft > N words | `review-chapter-goals` or side-by-side compare (deterministic first) |
| `draft-idle-after-spurt` | No draft edits for X min after large paste/word spike | `review-chapter-goals` |
| `unlinked-plants` | `findUnlinkedPlants` non-empty | Fix in draft or `review-continuity` |
| `alignment-stale` | Draft/outline mtime newer than last alignment report | **Refresh checks** (deterministic) |
| `alignment-warnings` | Deterministic report has warnings; user has not run AI review | `review-chapter-goals` |
| `structure-pass-due` | Chapter status checkbox “draft complete” or manual **Mark ready for review** | Revision Structure pass |
| `character-drift` | Mention conflicts with bible field (deterministic) | `explain-canon` or `summarise-character-arc` |

**Settings** (`~/.inscriva/settings.json` + optional per-book overrides in `.inscriva/config.json`):

- `recommendationsEnabled` (default true)
- Per-rule enable/disable
- Thresholds: word-target band (default **90–110%**, locked), idle minutes, minimum draft words for outline-compare hint
- **Never** “auto-run AI on recommendation”—only **Run** triggers `llmStream`

**UI placement:** chapter row badge, Alignment tab banner, subtle toast (dismissible), optional menu bar indicator—no modal blocking writing.

### 7.12 Writing sessions & discipline

**Intent:** Help the author track **time spent writing**, **words added this session**, and progress toward the **chapter word target**—with a durable log for discipline and retrospectives.

#### 7.12.1 Session clock & live stats

While a book is open and the user is editing a **draft** chapter:

| Stat | Source |
|------|--------|
| **Session clock** | Elapsed **active** writing time (idle pause after ~2 min without edits; configurable later) |
| **Words this session** | Net words added to the active draft since session start (`wordsAtEnd − wordsAtStart`, floored at 0) |
| **Target words** | Parsed from paired outline `## Word target` (single or range; display range or midpoint in UI) |
| **Progress** | Draft total word count vs target; band indicator uses locked **90–110%** (§7.11) |

**UI placement:** compact status strip (chapter workspace header or app footer)—always visible in chapter view, not blocking the editor.

#### 7.12.2 Persistence

| Store | Path | Role |
|-------|------|------|
| Machine log | `.inscriva/writing-sessions.jsonl` | Append-only JSON lines per closed session (technical) |
| Author log | `03 Revision/Writing log.md` | Markdown table rows appended on session end—**visible in file tree** |

**Session end** triggers when: user closes the book, switches chapter (optional split session), or app quit (flush). Each closed session records: `chapterKey`, `draftPath`, `startedAt`, `endedAt`, `wordsAtStart`, `wordsAtEnd`, `wordsAdded`, `targetWords`, `activeSeconds`.

#### 7.12.3 Discipline log format

`03 Revision/Writing log.md` uses a fixed table header (created on first session if missing):

```markdown
# Writing log

| Date | Chapter | Words added | Target | Active time |
|------|---------|-------------|--------|-------------|
```

Authors can review history in Obsidian or Inscriva file view; the app may later add a simple **Sessions** summary panel (Phase 2a+).

**Indexer:** `countWords`, `parseWordTarget`, `DEFAULT_WORD_TARGET_BAND` (0.9 / 1.1), and session record helpers in `packages/indexer` (implemented).

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
│   ├── indexer/                   # MD parse, anchors, canon, pairing, alignment, cast
│   └── llm/                       # Provider adapters, prompts, context builder (opt-in)
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
| **`inscriva/index.json`** | Chapters, cast, alignment metadata, glossary (for UI + external agents) |
| **Chapter workspace** | Primary writing/review surface for paired outline + draft |
| **Deterministic alignment** | Reliable structure signal without tokens |
| **AI recommendations** | Suggest when to invoke §7.7 tasks; never auto-call |

See **§7.7–§7.11** for full LLM and structure spec.

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
| Alignment usefulness | Authors run deterministic check on ≥80% of “draft complete” chapters (beta) |
| Zero background LLM calls | No provider requests without explicit user action (enforced in bridge audit) |
| Character sheet latency | Open sheet with mentions in <1s for books ≤30 chapters (indexed) |

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
- [x] Bridge: key management **UI** (`SettingsModal`: BYOK keys + default models per provider)
- [x] Web: tree, wikilinks, chapter pairing, chapter panel, canon hover
- [x] Web: line notes gutter (desktop layout; revise mode)
- [x] Web: welcome flow — open folder, GitHub OAuth clone, new book, recents
- [x] Dev without Tauri: local Node bridge (`pnpm dev:bridge`, port 3847)
- [x] Tauri Mac: wrap `dist/` (`frontendDist`, `beforeBuildCommand`)
- [x] Tauri Mac: menu + keyboard shortcuts (File / View; see README)
- [x] Tauri Mac: feature parity with dev-bridge (`notify` watch, GitHub OAuth, git push on autosave)
- [x] Notarisation: documented in README (manual release step; not CI-automated)

### Phase 2a — Structure & chapter workspace (4–6 weeks) ✓

- [x] Monsterosso outline parser (`Scene N`, turn-by-chapter-end, per-scene must/NOT) — `packages/indexer/src/outline-parse.ts`
- [x] Chapter pairing: numeric `01` filenames + H1 `ChNN` — `chapter-map.json` overrides loaded (edit via file tree / manual JSON for now)
- [ ] Chapter-map pairing **UI** (form in chapter rail)
- [x] Chapter rail + chapter workspace (draft / outline / alignment tabs); **chapter view default**, toggle to file view
- [x] Deterministic alignment report — cache `.inscriva/reports/` + export `03 Revision/Alignment/{chapterKey}.md` + Alignment tab
- [x] Writing session clock + words/target strip; append `.inscriva/writing-sessions.jsonl` + `03 Revision/Writing log.md` (§7.12)
- [x] Goal checklist (must-include heuristics + manual ticks)
- [x] Scene navigator in draft pane
- [x] Book index `.inscriva/index.json` (chapters, word counts, alignment timestamps)
- [x] AI recommendations engine (local rules only; word-target band **90–110%**; no auto LLM)
- [x] Plant checks in alignment panel + existing revision banner

### Phase 2b — LLM assist + revision (5–7 weeks) — *in progress*

- [x] `packages/llm`: OpenAI, Anthropic, Google adapters + context builder
- [x] Bridge: LLM proxy (streaming) — `apps/dev-bridge` + Tauri `llm_stream`
- [x] Assist panel: `draft-scene`, `fix-paragraph`, `review-continuity` / `review-voice` / `review-structure`, diff accept/reject
- [x] Inline **Write with AI** (selection / paragraph; `ActionsPanel` + pending suggestion accept/reject)
- [x] Settings: BYOK per provider, default models per provider
- [x] Revision pass modes + checklist (`RevisionPanel`; plant banner via `findUnlinkedPlants`)
- [x] “View context” before send (Assist panel; dev-bridge `/llm/preview`)
- [ ] Tasks: `review-chapter-goals`, `refresh-outline-from-draft` (opt-in, per §7.11)
- [ ] `expand-outline` / `brainstorm` in Assist task picker (prompts exist in `packages/llm`)
- [ ] Settings: recommendation thresholds (depends on §7.11 engine — Phase 2a)
- [ ] Structure pass → deterministic alignment then optional AI (alignment tab is Phase 2a)
- [ ] Plant `P##` linking in draft; canon soft warnings
- [ ] Session Pack export UI (backend + `fetchSessionPack`; no app action yet)
- [ ] Bridge guard: reject `llmStream` unless request includes `userInitiated: true`

### Phase 2c — Cast index (3–4 weeks)

- [ ] Parse Character Bible into entities (Monsterosso single-file + per-character files)
- [ ] Cast index build on watch; mention + dialogue heuristics
- [ ] Character sheet UI + jump-to-draft
- [ ] Click character name in editor → sheet
- [ ] Task: `summarise-character-arc` (opt-in)
- [ ] Optional generated `appearances.md` (book config)

### Phase 3 — Android + expansions (4–6 weeks)

- [ ] Tauri Android: clone repo, mobile layout, sync on resume, Assist panel (◐)
- [ ] OpenAI-compatible custom base URL
- [ ] PWA / browser + Sync API (if needed)
- [ ] Read-only sharing
- [ ] Style Guide rule packs (deterministic + LLM)
- [ ] Provider OAuth where APIs support it (research per vendor)
- [ ] Chapter board view; mobile chapter workspace (◐)
- [ ] Scene Ledger auto-suggest from draft headings (deterministic; AI optional)
- [ ] Master Outline reconcile from chapter statuses (opt-in)

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
| **Primary navigation** | **Chapter view default**; toggle to file view; preference `chapter` \| `files` \| `last used` |
| **`.inscriva/` role** | Technical/org cache (anchors, index, JSONL logs, machine reports)—not primary author surface |
| **Consumable reports** | Alignment and writing discipline surfaced under `03 Revision/` in the file tree |
| **Word-target band** | **90–110%** of outline target (recommendations + alignment UI) |
| **LLM invocation** | Opt-in only; recommendations suggest, never auto-call |
| **Structure truth** | Markdown files authoritative; `.inscriva/` caches are derived, rebuildable |

---

## 14. Open questions

### 14.1 Product (resolved — May 2026)

1. ~~**Default navigation**~~ → **Chapter view default**; toggle to file view (§7.8.4).
2. ~~**Alignment export**~~ → JSON cache in `.inscriva/reports/`; **always** write human-readable `03 Revision/Alignment/{chapterKey}.md` to the file tree (§7.9).
3. ~~**Word-target band**~~ → **90–110%** locked (§7.11; `DEFAULT_WORD_TARGET_BAND` in indexer).
4. ~~**Writing discipline**~~ → Session clock, words added, target words in UI; machine log + `03 Revision/Writing log.md` (§7.12).

### 14.2 Product (still open)

5. **Outline compare in outliner:** When editing outline with draft present, show split pane by default or only on recommendation click?
6. **Character bible shape:** Index single `Character Bible.md` (Monsterosso) vs folder of per-character files vs both—which is canonical for cast index v1?
7. **Generated appearances files:** Gitignore `_generated/`, commit for Obsidian, or in-app only?
8. **Recommendation aggressiveness:** Quiet (Alignment tab only) vs visible (toasts + chapter badges)—default?
9. **“Mark draft complete”:** Explicit author control for structure-pass recommendations, or infer from outline Status checkboxes only?
10. **AI report persistence:** Save full `review-chapter-goals` output to repo, or session-only unless user clicks Save?
11. **Session idle threshold:** Default 2 min without edits before pausing session clock—confirm or adjust?

### 14.3 Existing (unchanged until decided)

12. **Monterosso migration:** When to move to dedicated repo under `~/Writing/`?
13. **Git host:** GitHub private vs self-hosted; LFS for PDFs?
14. **New book template:** Skeleton only vs sample canon stubs?
15. ~~**Dev without Tauri:** Local Node bridge for `npm run dev` — worth building?~~ **Done** — `apps/dev-bridge`, `pnpm dev:bridge`.
16. **Scene Ledger:** Auto-suggest from headings (Phase 3)—deterministic first?
17. **Default models:** Ship recommended model IDs per provider/task, or force user to choose?
18. **ai-log.jsonl:** Commit to book repo (team traceability) or gitignore (privacy)?
19. **Local models:** Ollama via OpenAI-compatible URL—Phase 2b or 3?

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
  taskId: 'draft-scene' | 'fix-paragraph' | 'review-continuity' | 'review-chapter-goals' | /* … */;
  provider: 'openai' | 'anthropic' | 'google' | 'custom';
  model: string;
  bookId: string;
  chapterKey?: string;       // e.g. Ch01
  userInitiated: true;       // required — bridge rejects if false
  recommendationId?: string; // if launched from §7.11 suggestion
  anchorId?: string;
  selection?: { from: number; to: number };
  userMessage?: string;      // optional author instruction
  contextOverrides?: Partial<ContextBundle>;
  deterministicReport?: object; // alignment JSON from §7.9.1
}
```

### D — Reference workflow ([[01.72 Monsterosso/Writing Plan - AI Novella Workflow]])

| Stage | Inscriva support |
|-------|------------------|
| Canon lock | Canon index + cast index + context builder |
| Master outline | `expand-outline` task; graph (later) |
| Chapter outlines | Chapter workspace outline pane + `expand-outline` |
| Draft | `draft-scene`, editor, diff apply, scene navigator |
| On-course check | Deterministic alignment + opt-in `review-chapter-goals` |
| Outline sync after draft | Opt-in `refresh-outline-from-draft` |
| Character tracking | Cast index + character sheet + `summarise-character-arc` |
| Revision passes | Pass modes + `review-*` tasks + notes + recommendations |
| Assembly | Pandoc hook (later) |

| External session type (workflow doc) | Inscriva task |
|--------------------------------------|--------------|
| Expand outline | `expand-outline` |
| Draft prose | `draft-scene` |
| Check chapter vs outline | Deterministic alignment + `review-chapter-goals` (opt-in) |
| Update outline from draft | `refresh-outline-from-draft` (opt-in) |
| Fix continuity | `review-continuity` + `fix-paragraph` |
| Voice pass | `review-voice` |
| Character arc review | `summarise-character-arc` (opt-in) |
| Brainstorm only | `brainstorm` (no draft write without confirm) |

---

## Related

- [[Inscriva]]
- [[commercialisation/README]] — commercial SaaS / licensing transition (separate PRD and delivery plan)
- [[01.72 Monsterosso/Monsterosso]]
- [[01.72 Monsterosso/Writing Plan - AI Novella Workflow]]
