# Epic E05 — Usage metering and hosted AI billing (optional)

**Phase:** C3  
**Dependencies:** E01 (control plane persistence and auth), product decision to offer Inscriva-billed inference  
**Primary code:** `apps/control-plane`, `packages/llm`, `packages/web` (dashboard), bridge if proxy path changes

## Goal

If you introduce **hosted** or **aggregated** AI usage billed by Inscriva, add a **tamper-resistant usage ledger**, **quota evaluation**, and **customer-visible usage** — without conflating BYOK (user’s own keys) with metered hosted calls.

---

## Preconditions (product + legal)

- [ ] Privacy policy updated for any content that passes through Inscriva servers for inference.
- [ ] Clear separation in UI: “Your API key” vs “Inscriva credits”.

---

## Stories

### COM-501 — Usage event ingestion API

**Acceptance criteria**

- [ ] Only **server-side** components can record billable usage (control plane or trusted worker), not the browser alone.
- [ ] Events include: `userId`, `timestamp`, `model`, `inputTokens`, `outputTokens`, `taskId`, `idempotencyKey`.
- [ ] Duplicate `idempotencyKey` no-ops.

**TDD**

- [ ] Unit tests for normalisation and deduplication.
- [ ] Fuzz tests for invalid payloads rejected with stable error codes.

---

### COM-502 — Quota evaluation and user dashboard

**Acceptance criteria**

- [ ] User can see period usage vs allowance.
- [ ] Hard cap vs soft cap behaviour documented and implemented.
- [ ] API used by assist pipeline before issuing hosted calls.

**TDD**

- [ ] Table tests for quota math (rollover, partial periods, timezone boundaries).

---

### COM-503 — Abuse limits and reconciliation

**Acceptance criteria**

- [ ] Rate limits per user and global circuit breaker hooks.
- [ ] Nightly reconciliation job compares internal ledger to provider billing exports (where available).

**TDD**

- [ ] Job tests with fixture CSV/JSON from provider.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-20 | Initial epic draft. |
