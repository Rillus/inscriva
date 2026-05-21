# Epic E03 — Bridge and desktop entitlements

**Phases:** C1 (skeleton), C2 (grace + parity hardening)  
**Dependencies:** E01 COM-105, E02 session/token strategy  
**Primary code:** `packages/bridge`, `apps/dev-bridge`, `apps/desktop-macos`

## Goal

Ensure **paid capabilities** enforced in native/local contexts respect the same entitlements as the web app, with **sensible offline behaviour** and no leakage of BYOK secrets to the cloud.

---

## Principles

- Entitlement checks are **orthogonal** to BYOK: cloud never receives provider API keys.
- Bridge may cache entitlements; cache policy must tolerate short outages (see COM-302).

---

## Stories

### COM-301 — Bridge: fetch and cache entitlements

**Acceptance criteria**

- [ ] Dev bridge can obtain entitlement or signed token using user session established in web flow **or** device linking flow (exact UX decided in E02/E01).
- [ ] Cache TTL configurable; forced refresh on demand (e.g. menu action).
- [ ] When unpaid, LLM-related bridge routes return a structured error the web UI can interpret (existing error patterns in `packages/web`).

**TDD**

- [ ] `packages/bridge`: unit tests for HTTP client + cache with fake server.
- [ ] `apps/dev-bridge`: integration test with mocked control plane (Vitest + `msw` or inline mock).

---

### COM-302 — Offline grace window and UX

**Acceptance criteria**

- [ ] If control plane unreachable but cache valid → continue within policy.
- [ ] If cache expired → degrade features with clear messaging; no silent premium features.
- [ ] Documented maximum grace duration (product decision from PRD §12).

**TDD**

- [ ] Time-based tests for cache expiry branches.

---

### COM-303 — Desktop parity (Tauri)

**Acceptance criteria**

- [ ] Same entitlement contract as dev-bridge.
- [ ] Secure storage for refresh tokens or device credentials if required by auth design — **never** store raw provider LLM keys in new locations.

**TDD**

- [ ] Rust-side tests where feasible; otherwise shared TS tests in `packages/bridge` plus one Tauri integration smoke in CI if already present.

---

## Changelog

| Date | Change |
|------|--------|
| 2026-05-20 | Initial epic draft. |
