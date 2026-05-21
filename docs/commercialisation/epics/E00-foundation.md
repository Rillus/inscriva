# Epic E00 — Foundation, vendors, and schema

**Phase:** C0  
**Owner:** Product + engineering lead  
**Dependencies:** None

## Goal

Make irreversible decisions cheap: commercial model, vendors, entitlement schema, and environments before building the control plane.

---

## Stories

### COM-001 — Lock commercial model and plan SKUs

**As a** product owner  
**I want** a minimal, documented set of plans (e.g. trial, Pro monthly/annual, lifetime BYOK)  
**So that** engineering and billing configuration stay aligned.

**Acceptance criteria**

- [ ] Named SKUs with public marketing names and internal IDs.
- [ ] Explicit mapping: which product capabilities each SKU unlocks (see COM-003).
- [ ] Refund and trial policy summarised in one page (can link to legal later).

**TDD / quality**

- N/A (document); add machine-readable `plans.json` or similar in control plane in COM-103 if useful.

---

### COM-002 — Select auth and billing vendors; privacy impact

**As a** engineering lead  
**I want** chosen auth and payment providers with documented data flows  
**So that** privacy policy and DPA coverage are accurate before launch.

**Acceptance criteria**

- [ ] Auth vendor chosen; list of PII categories stored.
- [ ] Billing vendor chosen (e.g. Stripe); webhook URL strategy documented.
- [ ] Draft ROPA-style table: data subject, purpose, retention, subprocessors.

**TDD / quality**

- N/A; output is a short `docs/commercialisation/decisions/` note or section in this file (optional follow-up: create `decisions/` folder with ADRs).

---

### COM-003 — Define entitlement JSON schema + versioning

**As a** developer  
**I want** a versioned entitlement payload consumed by web and bridge  
**So that** we can evolve plans without breaking clients.

**Acceptance criteria**

- [ ] Schema includes: `schemaVersion`, `userId`, `planId`, `status`, `expiresAt` (nullable), `flags` (feature map), `sources` (subscription vs lifetime).
- [ ] Migration rule documented for bumping `schemaVersion`.
- [ ] Example fixtures checked into repo (e.g. `apps/control-plane/test/fixtures/entitlements/` when package exists).

**TDD / quality**

- [ ] Unit tests validate fixtures against schema (Zod/JSON Schema) in control plane once COM-101 exists; until then, colocate fixtures under `docs/commercialisation/fixtures/` **or** add a tiny `packages/entitlement-schema` package if you want tests in C0 without the full API.

---

### COM-004 — Provision dev/staging/prod + secrets

**As a** developer  
**I want** isolated environments  
**So that** billing tests never touch production data.

**Acceptance criteria**

- [ ] Three environments with distinct secrets and databases.
- [ ] No production secrets in git; documented rotation.
- [ ] CI can deploy staging from main (or release branch) — mechanism documented even if not implemented in C0.

**TDD / quality**

- Smoke test: health endpoint returns 200 in staging (after COM-101).

---

## Primary code areas (C0)

- `docs/commercialisation/` — decisions and fixtures.
- Optional new: `docs/commercialisation/decisions/` for ADRs (create when first ADR is written).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-20 | Initial epic draft. |
