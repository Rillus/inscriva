# Epic E01 — Control plane backend

**Phases:** C1 (core), C2 (lifetime + hardening), C3 (metering)  
**Dependencies:** E00  
**Consumes:** Auth vendor, Stripe (or equivalent), database

## Goal

Run a small backend that owns **identity mapping**, **subscription and one-time purchases**, **webhook-driven state**, and **entitlement issuance** for `packages/web` and bridge hosts.

**Proposed package:** `apps/control-plane` (Fastify/Hono/Express — team choice). Stories assume a single deployable with a `/health` route and a `/v1` API prefix.

---

## Stories

### COM-101 — Bootstrap control-plane app and health checks

**Acceptance criteria**

- [ ] HTTP server starts in dev; `/health` returns JSON with build/version.
- [ ] Dockerfile or platform manifest documented for production.
- [ ] `pnpm` workspace entry so `pnpm --filter @inscriva/control-plane test` (or chosen name) runs Vitest.

**TDD**

- [ ] Test: `GET /health` returns 200 and expected shape.

---

### COM-102 — User identity mapping

**Acceptance criteria**

- [ ] Internal `user_id` stable across auth provider subject changes where possible.
- [ ] Link table or equivalent: `auth_subject` → `user_id`.
- [ ] Protected routes require valid auth (middleware).

**TDD**

- [ ] Tests for subject→user creation and lookup idempotency.

---

### COM-103 — Stripe products/prices and checkout session

**Acceptance criteria**

- [ ] Create Checkout Session for subscription SKUs (test mode in dev).
- [ ] Price IDs loaded from env, not hard-coded secrets.
- [ ] Success/cancel URLs documented for `packages/web`.

**TDD**

- [ ] Mock Stripe client: session creation payload tests.
- [ ] Integration test in test mode (optional CI nightly if rate limits apply).

---

### COM-104 — Webhook: idempotent subscription lifecycle

**Acceptance criteria**

- [ ] Verify webhook signatures.
- [ ] Persist Stripe `event.id`; duplicates no-op.
- [ ] Map events to internal subscription states affecting entitlements.

**TDD**

- [ ] Fixture-driven tests for each critical event type (`checkout.session.completed`, `customer.subscription.*`, `invoice.paid`, etc. — exact set from Stripe integration checklist).
- [ ] Property or table test: duplicate delivery does not double-apply.

---

### COM-105 — Entitlement read API + bridge token

**Acceptance criteria**

- [ ] Authenticated user can fetch current entitlement document (COM-003 schema).
- [ ] Short-lived signed token (or equivalent) for bridge refresh without long-lived web cookies in native hosts — **exact mechanism locked in E00 ADR**.
- [ ] Rate limits on refresh endpoint documented.

**TDD**

- [ ] Contract tests: response matches schema for each plan fixture.
- [ ] Tests for expired token and renewal path.

---

### COM-106 — Database migrations and backups

**Acceptance criteria**

- [ ] Migration tool chosen (e.g. Drizzle/Knex/Prisma).
- [ ] Backup and restore tested once on staging.

**TDD**

- [ ] Migration tests in CI (apply from clean DB).

---

## C2 extensions (same epic)

- Lifetime one-time purchase flow: extend COM-103/104; new entitlement source `lifetime_byok`.
- Cancellation and grace: extend state machine tests in COM-104.

## C3 extensions (same epic)

- COM-501–503: usage ingest tables, quota evaluation endpoints (see E05).

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-20 | Initial epic draft. |
