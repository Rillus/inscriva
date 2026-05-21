# Epic E04 — Operations, legal, and admin

**Phases:** C1 (minimal), C2 (full)  
**Dependencies:** E00 (policies), E01 (data exists to support admin)

## Goal

Ship a **production-grade** boundary: hosting, observability, legal pages, incident response, and **internal tools** to support paying customers without database surgery.

---

## Stories

### COM-401 — Production web hosting + domain + TLS

**Acceptance criteria**

- [ ] Custom domain serves `packages/web` production build over HTTPS.
- [ ] HSTS and sensible security headers (documented).
- [ ] Control plane API on separate subdomain or path prefix; CORS locked down.

**TDD**

- [ ] Infrastructure as code or runbook with checklist; optional e2e against staging URL.

---

### COM-402 — Observability

**Acceptance criteria**

- [ ] Structured logs (request id, user id where safe).
- [ ] Metrics: error rate, latency p95, webhook processing backlog.
- [ ] Alerts for billing webhook failures and DB connectivity.

**TDD**

- [ ] Log format contract tested (snapshot or schema).

---

### COM-403 — Legal pages published

**Acceptance criteria**

- [ ] Privacy, terms, cookies, acceptable use available at stable URLs.
- [ ] AI disclosure: BYOK vs any future hosted inference (align with [`../PRD.md`](../PRD.md) and core [`../../PRD.md`](../../PRD.md)).

**TDD**

- [ ] Link checker in CI optional; manual legal review tracked.

---

### COM-404 — Admin/support tooling

**Acceptance criteria**

- [ ] Authenticated internal users can look up account by email and see subscription + entitlement.
- [ ] Manual entitlement override audited (who/when/why).
- [ ] Runbook for refund and Stripe credit notes.

**TDD**

- [ ] Authorization tests: non-admin cannot access admin routes.

---

### COM-405 — Status page and incident comms

**Acceptance criteria**

- [ ] Status page exists (vendor or self-hosted).
- [ ] Incident template: customer impact, workaround, ETA, postmortem link.

**TDD**

- N/A (process); optional dry-run recorded.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-20 | Initial epic draft. |
