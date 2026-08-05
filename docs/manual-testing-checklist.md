# Manual testing checklist

Use this before a release or after large changes. Run against **dev-bridge + web**, **Tauri macOS**, and (when available) **Tauri Android** / **PWA**.

Legend: ☐ not tested · ◐ partial · ☑ passed

---

## Environment setup

| # | Task | dev-bridge | macOS | Android | PWA |
|---|------|:----------:|:-----:|:-------:|:---:|
| 1 | Open book from recents | ☐ | ☐ | ☐ | — |
| 2 | Open book via folder picker | ☐ | ☐ | ☐ | — |
| 3 | Clone book from Git URL | ☐ | ☐ | ☐ | — |
| 4 | GitHub OAuth connect + clone repo | ☐ | ☐ | ☐ | — |
| 5 | Create new book scaffold | ☐ | ☐ | ☐ | — |
| 6 | Demo book (`?demo=1`) loads | ☐ | ☐ | ☐ | ☐ |
| 7 | LLM API key save/clear in Settings | ☐ | ☐ | ☐ | — |
| 8 | Custom OpenAI base URL (Ollama) streams | ☐ | ☐ | ☐ | — |

---

## Chapter workspace

| # | Task | dev-bridge | macOS | Android | PWA |
|---|------|:----------:|:-----:|:-------:|:---:|
| 9 | Chapter rail: switch chapter restores draft | ☐ | ☐ | ☐ | ☐ |
| 10 | Board view: status columns + select chapter | ☐ | ☐ | ☐ | ☐ |
| 11 | Workspace tabs: Draft / Outline / Alignment / Cast | ☐ | ☐ | ☐ | ☐ |
| 12 | Draft autosave + anchor sidecar written | ☐ | ☐ | ☐ | — |
| 13 | File tree: create, rename, delete, move | ☐ | ☐ | ☐ | — |
| 14 | Chapter map overrides persist | ☐ | ☐ | ☐ | — |
| 15 | URL deep link `?file=…&line=…` opens location | ☐ | ☐ | ☐ | ☐ |
| 16 | Mobile sidebar toggle (☰) opens navigation | — | ☐ | ☐ | ☐ |

---

## Modes: Draft / Revise / Read

| # | Task | dev-bridge | macOS | Android | PWA |
|---|------|:----------:|:-----:|:-------:|:---:|
| 17 | Draft mode: editor editable | ☐ | ☐ | ☐ | ☐ |
| 18 | Read mode: editor read-only | ☐ | ☐ | ☐ | ☐ |
| 19 | Revise mode: notes gutter + revision passes | ☐ | ☐ | ☐ | ☐ |
| 20 | Add paragraph note persists to `.inscriva/notes` | ☐ | ☐ | ☐ | — |
| 21 | Structure pass: alignment refresh + goals assist | ☐ | ☐ | ☐ | ☐ |
| 22 | Tone pass: Style Guide deterministic violations | ☐ | ☐ | ☐ | ☐ |
| 23 | Tone pass: click violation jumps in draft | ☐ | ☐ | ☐ | ☐ |
| 24 | Plant insert from revision panel | ☐ | ☐ | ☐ | ☐ |
| 25 | Read-aloud pass: no auto-rewrite | ☐ | ☐ | ☐ | ☐ |

---

## Alignment & recommendations

| # | Task | dev-bridge | macOS | Android | PWA |
|---|------|:----------:|:-----:|:-------:|:---:|
| 26 | Run alignment refresh; report matches draft | ☐ | ☐ | ☐ | ☐ |
| 27 | Alignment export under `03 Revision/` | ☐ | ☐ | ☐ | — |
| 28 | Goal checklist toggles persist | ☐ | ☐ | ☐ | — |
| 29 | Recommendations respect Settings toggles | ☐ | ☐ | ☐ | ☐ |
| 30 | Dismiss recommendation stays dismissed | ☐ | ☐ | ☐ | ☐ |

---

## Cast index

| # | Task | dev-bridge | macOS | Android | PWA |
|---|------|:----------:|:-----:|:-------:|:---:|
| 31 | Cast tab lists chapter characters | ☐ | ☐ | ☐ | ☐ |
| 32 | Click character name in editor opens sheet | ☐ | ☐ | ☐ | ☐ |
| 33 | Jump to mention opens draft at snippet | ☐ | ☐ | ☐ | ☐ |
| 34 | Summarise character arc (Assist, opt-in) | ☐ | ☐ | ☐ | ☐ |
| 35 | Export all appearances → `_generated/*.md` | ☐ | ☐ | ☐ | — |

---

## Assist & Actions

| # | Task | dev-bridge | macOS | Android | PWA |
|---|------|:----------:|:-----:|:-------:|:---:|
| 36 | Assist panel: stream without `userInitiated` rejected | ☐ | ☐ | ☐ | — |
| 37 | Apply assist text writes to draft (confirm) | ☐ | ☐ | ☐ | ☐ |
| 38 | Refresh outline from draft (apply to outline) | ☐ | ☐ | ☐ | ☐ |
| 39 | Expand outline from Master Outline bar | ☐ | ☐ | ☐ | ☐ |
| 40 | Copy session pack | ☐ | ☐ | ☐ | ☐ |
| 41 | Write with AI: pending accept/reject | ☐ | ☐ | ☐ | ☐ |
| 42 | Mobile: Assist panel scrolls in right rail | — | ☐ | ☐ | ☐ |

---

## Git & sync

| # | Task | dev-bridge | macOS | Android | PWA |
|---|------|:----------:|:-----:|:-------:|:---:|
| 43 | Git status dirty/clean indicator | ☐ | ☐ | ☐ | — |
| 44 | Pull from remote | ☐ | ☐ | ☐ | — |
| 45 | Autosave commit on idle interval | ☐ | ☐ | ☐ | — |
| 46 | Sync on resume: tab focus → pull + refresh | ☐ | ☐ | ☐ | ☐ |
| 47 | Master Outline: Sync chapter statuses | ☐ | ☐ | ☐ | ☐ |
| 48 | Scene Ledger append from draft headings | ☐ | ☐ | ☐ | — |

---

## Sharing & install

| # | Task | dev-bridge | macOS | Android | PWA |
|---|------|:----------:|:-----:|:-------:|:---:|
| 49 | Share link copies `?share=1` URL | ☐ | ☐ | ☐ | ☐ |
| 50 | Share mode: read-only, no saves | ☐ | ☐ | ☐ | ☐ |
| 51 | PWA: Add to Home Screen / install prompt | — | — | — | ☐ |
| 52 | PWA: offline shell loads (cached assets) | — | — | — | ☐ |

---

## Writing session

| # | Task | dev-bridge | macOS | Android | PWA |
|---|------|:----------:|:-----:|:-------:|:---:|
| 53 | Session strip: words added + timer on draft edit | ☐ | ☐ | ☐ | ☐ |
| 54 | Session closes on chapter switch | ☐ | ☐ | ☐ | ☐ |
| 55 | Writing log appended on session end | ☐ | ☐ | ☐ | — |

---

## Android-specific (device QA)

| # | Task | Notes |
|---|------|-------|
| 56 | Clone via GitHub OAuth into app books library | Default parent path, no folder picker |
| 57 | API keys in Android Keystore via Settings | |
| 58 | Git pull/push on real network | May need credential helper |
| 59 | App resume from background triggers sync | |
| 60 | External keyboard shortcuts (if applicable) | |

---

## Regression smoke (5 min)

1. Open book → edit draft → confirm autosave.
2. Revise → add note → switch chapter → return.
3. Alignment refresh → one recommendation → run linked assist.
4. Cast → character sheet → jump to mention.
5. Settings → save API key → Assist dry run (preview context).

---

*Update platform columns as shells ship. File issues for any ☐ that fails on the target platform.*
