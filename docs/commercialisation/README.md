# Commercialisation documentation

This folder holds everything needed to plan and execute the transition from the current **local-first / BYOK** product to a **paid, domain-hosted** offering (subscription, optional usage billing, lifetime BYOK licence).

## How this is organised

| Path | Purpose |
|------|---------|
| [`PRD.md`](PRD.md) | Product requirements for commercialisation (strategy, requirements, phases C0–C3, risks). |
| [`implementation-plan.md`](implementation-plan.md) | Master delivery plan: phases, dependency graph, package touchpoints, story index, TDD gates. |
| [`epics/README.md`](epics/README.md) | Epic catalogue with IDs and links to per-epic story files. |
| [`epics/*.md`](epics/) | One file per epic: user stories, acceptance criteria, suggested tests, repo areas. |
| [`decisions/README.md`](decisions/README.md) | Where to put ADRs (auth, billing, entitlement transport). |

### Conventions

- **Story IDs** use the prefix `COM-` (e.g. `COM-204`) for traceability in issues and PRs.
- **Phases** align with the PRD: **C0** foundation, **C1** paid core, **C2** lifetime + hardening, **C3** usage metering (optional).
- **Epics** use **E00–E05**; see [`epics/README.md`](epics/README.md).
- New commercial docs belong under `docs/commercialisation/` (or `epics/`) unless they are legal drafts you intentionally keep out of git.

### Related product docs

- [`../PRD.md`](../PRD.md) — core product roadmap (editor, bridge, LLM assist).
- [`../PRD-commercialisation.md`](../PRD-commercialisation.md) — stub redirect to this folder.

When the core PRD and commercial PRD diverge on scope, treat **core PRD** as the writing-product source of truth and **commercial PRD** as the go-to-market and control-plane source of truth; resolve conflicts explicitly in `implementation-plan.md`.
