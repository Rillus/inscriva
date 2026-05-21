# Epic E02 — Web commercial surfaces

**Phase:** C1 (core), C2 (lifetime UX)  
**Dependencies:** E01 (COM-105 stable or stubbed)  
**Primary code:** `packages/web`

## Goal

Expose a credible **public site** and **authenticated account experience**: pricing, checkout hand-off, post-purchase confirmation, billing portal links, and in-app **feature gates** aligned with entitlements.

---

## Stories

### COM-201 — Marketing layout: landing, pricing, legal footer

**Acceptance criteria**

- [ ] Routes or sections for landing and pricing (exact router matches existing Svelte app patterns).
- [ ] Footer links to privacy, terms, contact (placeholders acceptable until COM-403 content exists).
- [ ] Responsive layout and basic a11y (headings, focus order).

**TDD**

- [ ] Component or route tests for critical copy regions (optional snapshot minimal).
- [ ] Smoke: build passes and key routes render in Vitest/happy-dom if already used in `packages/web`.

---

### COM-202 — Sign-in/up wired to auth vendor

**Acceptance criteria**

- [ ] User can sign in and out; session survives refresh where vendor supports it.
- [ ] Protected “account” area redirects when unauthenticated.
- [ ] Environment variables documented (`VITE_*` or server-side pattern per auth choice).

**TDD**

- [ ] Unit tests for auth guard helpers (pure functions: “should redirect given session state”).
- [ ] Integration tests as far as vendor test harness allows.

---

### COM-203 — Post-checkout success and entitlement polling

**Acceptance criteria**

- [ ] After Stripe success URL, user sees clear confirmation and entitlement becomes active without manual refresh (poll or websocket as appropriate).
- [ ] Error state if webhook delayed beyond N seconds (copy + retry).

**TDD**

- [ ] Test polling/backoff logic with fake clock or injected timers.

---

### COM-204 — Account area and “manage billing”

**Acceptance criteria**

- [ ] Display current plan and renewal date (subscription) or lifetime badge.
- [ ] Deep link to Stripe Customer Portal (or equivalent) when applicable.
- [ ] No sensitive payment data in app logs.

**TDD**

- [ ] Mapper tests: API DTO → UI model.

---

### COM-205 — Feature gates (config-driven)

**Acceptance criteria**

- [ ] Single module resolves “can use feature X” from entitlement document.
- [ ] Paywalled actions show consistent upsell UI (not silent failures).

**TDD**

- [ ] Table-driven tests for each `flags` combination used at launch.

---

## C2 additions

- Lifetime purchase CTA and FAQ (what “lifetime” includes).
- Improved copy for `past_due` and grace states when surfaced from API.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-20 | Initial epic draft. |
