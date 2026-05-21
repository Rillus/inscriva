# Inscriva Commercialisation PRD

**Canonical path:** `docs/commercialisation/PRD.md` — see [`README.md`](README.md) for the full filing index.  
**Document status:** Draft v0.1  
**Date:** 20 May 2026  
**Author:** Riley + AI  
**Scope:** Transition from current local-first app to a production commercial offering (hosted SaaS and/or BYOK licence tiers).

---

## 1. Executive summary

Inscriva is currently positioned as a local-first writing product with bridge-native capabilities and BYOK AI support. To commercialise it for paid users on a domain, the product needs a production cloud control plane for account management, subscriptions/licensing, billing, usage metering, policy enforcement, support tooling, and operational reliability.

This PRD defines a staged approach that preserves local-first strengths while enabling paid plans:

1. **SaaS subscription** (monthly/annual, optional usage add-ons),
2. **Token-metered hosted AI** (if Inscriva-billed inference is introduced),
3. **Lifetime BYOK licence** (no bundled tokens; paid for product capabilities/support).

---

## 2. Problem and opportunity

### 2.1 Current state (from repo roadmap)

- Product and architecture are strong for writer workflow, local files, and Git sync.
- The current strategy explicitly excludes hosted multi-tenant SaaS in v1.
- There is no production auth, tenant model, billing engine, or entitlement service.
- BYOK exists conceptually and partly in implementation, but commercial policy layers are missing.

### 2.2 Why transition now

- Paid distribution requires clear value packaging, reliable access control, and legal/compliance readiness.
- Domain-hosted onboarding dramatically lowers friction versus local-only setup.
- Hybrid monetisation (subscription + BYOK lifetime option) can serve both recurring and ownership-oriented users.

---

## 3. Product goals and non-goals

### 3.1 Goals

1. Launch a secure, reliable paid product at a production domain.
2. Support at least two monetisation paths:
   - recurring subscription,
   - BYOK-focused paid tier (including potential lifetime licence).
3. Maintain local-first writing flow and clean markdown compatibility.
4. Introduce commercial-grade operations: observability, support, incident handling, and compliance.
5. Build commercial features with a TDD-first process across backend, web, and bridge boundaries.

### 3.2 Non-goals (initial commercial launch)

- Enterprise SSO/SCIM.
- Team workspace collaboration and permissions.
- Marketplace/plugin ecosystem.
- Full mobile parity as a launch blocker (desktop/web may launch first).

---

## 4. Target customers and pricing hypotheses

### 4.1 Customer segments

- **Indie fiction writers** who want structure + AI assist with data ownership.
- **Power users** with existing API provider accounts (BYOK preference).
- **Users seeking simplicity** who prefer bundled usage and one bill (optional hosted AI add-on).

### 4.2 Pricing model candidates

#### Model A: Subscription only
- Free trial (time-limited).
- Pro monthly/annual.
- Optional token bundles if hosted inference exists.

#### Model B: Subscription + BYOK lifetime
- Pro monthly/annual for hosted conveniences and updates/support.
- One-time lifetime BYOK licence with feature caps or no hosted token allowance.

#### Model C: BYOK-first licence + optional cloud add-ons
- Lower recurring dependence.
- Paid add-ons for sync/control-plane features, advanced support, or hosted AI credits.

**Recommendation for launch:** Start with **Model B** to validate both recurring and ownership demand while keeping messaging clear.

---

## 5. Commercial requirements (what must be added)

### 5.1 Identity, access, and tenancy

**Must-have**
- Email/password and social login (or managed auth provider).
- Verified email, password reset, session management.
- User account profile and plan status.
- Entitlement checks that work for both web and bridge clients.

**Decisions needed**
- Auth provider choice (e.g. Clerk/Auth0/Supabase Auth/custom).
- Device/session limits by tier.
- Offline grace period policy for paid entitlements.

### 5.2 Billing and licensing

**Must-have**
- Subscription lifecycle: trial, active, past_due, cancelled.
- Payment processor integration (typically Stripe first).
- Webhooks with idempotent processing.
- In-app billing portal access.
- VAT/GST-ready invoicing and tax handling.

**For lifetime BYOK tier**
- One-time checkout + non-expiring entitlement record.
- Refund policy implementation and manual override tools.
- Explicit product scope (what lifetime includes/excludes).

### 5.3 Usage metering (if token-based billing is enabled)

**Must-have**
- Provider-normalised usage ledger (input/output tokens, model, timestamp).
- Signed event ingestion API (prevent client-side tampering).
- Near-real-time quota checks and overage handling.
- User-facing usage dashboard and alerts.

**Guardrails**
- Hard monthly spend caps.
- Rate limits and abuse detection.
- Reconciliation jobs against provider statements.

### 5.4 Plans and entitlements

**Must-have**
- Central plan definition (features, limits, support tier).
- Feature flags/entitlement middleware in all clients.
- Migration tooling for plan changes and grandfathered users.

**Plan examples**
- `free-trial`: limited duration/features.
- `pro-subscription`: full product + support SLA target.
- `lifetime-byok`: full core editor workflow + BYOK features, no bundled hosted credits unless purchased.

### 5.5 Web production infrastructure and domain readiness

**Must-have**
- Production hosting for web app (custom domain, TLS, CDN).
- API service(s) for auth, billing, entitlements, metering.
- Secrets management and environment separation (dev/staging/prod).
- Database for users, plans, subscriptions, licences, usage events.
- Backup and restore runbooks with tested recovery objective.

### 5.6 Security, privacy, and compliance baseline

**Must-have at launch**
- Updated privacy policy and terms of service.
- Data processing inventory and retention policy.
- Encryption in transit; encryption at rest for sensitive data.
- Audit logging for privileged admin actions.
- Incident response policy and breach notification process.

**Near-term after launch**
- SOC 2 readiness roadmap.
- DPA template and regional data controls.

### 5.7 Admin and support operations

**Must-have**
- Internal admin console (or secure back-office scripts) for:
  - account lookup,
  - entitlement correction,
  - refund/credit notes,
  - fraud/abuse intervention.
- Support workflow integration (email/helpdesk).
- Status page and incident comms templates.

### 5.8 Product analytics and experimentation

**Must-have**
- Privacy-conscious event taxonomy.
- Funnel metrics: visit -> signup -> trial -> paid conversion.
- Retention and churn metrics by plan.
- A/B experiment hooks for pricing and onboarding iterations.

### 5.9 Legal and finance readiness

**Must-have**
- Terms, privacy, cookie policy, acceptable use policy.
- Clear AI disclosure language (BYOK vs hosted models, data flow).
- Revenue recognition and bookkeeping workflow.
- Jurisdiction and consumer-rights policy coverage (refund/cooling-off where relevant).

---

## 6. Architecture changes

### 6.1 Current architecture (simplified)
- Web app + local bridge + local files/Git.
- No mandatory cloud control plane.

### 6.2 Target commercial architecture

- **Frontend:** existing web app with account area, pricing pages, paywall surfaces.
- **Control plane API:** auth, plans, entitlements, billing webhook handling.
- **Billing provider:** subscription + one-time payments.
- **Usage service:** token/events ingest, quota evaluation, ledger storage (if hosted usage billing exists).
- **Admin/support tools:** guarded internal interfaces.

### 6.3 Bridge/client impact

- Bridge calls requiring paid capability should request/refresh signed entitlements.
- Offline mode should continue for a bounded grace window, then require revalidation.
- BYOK key management remains local/secure; commercial checks should never require key exfiltration.

---

## 7. User journeys (commercial)

1. **New user to paid subscription**
   - Land on domain -> sign up -> trial starts -> choose plan -> payment -> entitlement active.
2. **Existing BYOK user buys lifetime**
   - Sign in -> choose lifetime BYOK -> one-time payment -> perpetual entitlement granted.
3. **Overdue payment recovery**
   - Subscription enters past_due -> in-app banner + email -> grace window -> restore after successful payment.
4. **Usage overage flow (if enabled)**
   - Usage reaches threshold -> warning -> hard/soft cap behaviour -> optional top-up purchase.

---

## 8. Success metrics

### 8.1 Commercial
- Trial-to-paid conversion rate.
- Monthly recurring revenue (MRR).
- Churn (logo and revenue churn).
- Average revenue per user (ARPU).
- Lifetime tier take rate.

### 8.2 Product and reliability
- Entitlement check p95 latency.
- Failed payment recovery rate.
- Billing webhook processing success rate.
- Support first-response SLA attainment.
- Uptime/error budget for customer-facing APIs.

### 8.3 Trust and safety
- Security incident count/severity.
- Fraud/chargeback rate.
- Data deletion request turnaround time.

---

## 9. Rollout plan

### Phase C0: Foundation (2-3 weeks)
- Finalise commercial model and policy decisions.
- Pick auth + billing providers.
- Define canonical entitlement schema.
- Set up staging/prod environments.

### Phase C1: Paid core launch (4-6 weeks)
- Implement auth, subscription billing, entitlement middleware.
- Launch pricing page, checkout, account/billing portal.
- Add admin support tooling and basic analytics.
- Private beta with manual onboarding fallback.

### Phase C2: BYOK lifetime and hardening (3-5 weeks)
- Add one-time lifetime SKU and entitlement paths.
- Implement grace periods, retries, and cancellation nuances.
- Improve support automations and reconciliation jobs.
- Public launch readiness review.

### Phase C3: Usage billing (optional, 4-6 weeks)
- Add token/event metering service.
- Introduce usage dashboard and top-ups/overages.
- Expand abuse controls and financial reconciliation.

---

## 10. Delivery approach and TDD strategy

Commercial infrastructure should be delivered test-first with explicit acceptance tests per capability.

### 10.1 Test pyramid
- **Unit tests:** billing state machine, entitlement resolution, quota calculations.
- **Contract tests:** payment webhook payloads and provider API contracts.
- **Integration tests:** auth -> checkout -> entitlement activation -> gated feature access.
- **End-to-end tests:** domain signup to paid usage in staging.

### 10.2 Mandatory TDD quality gates
- Red-green-refactor cycle required for new billing/entitlement logic.
- No merge without passing tests for new plan states and regression scenarios.
- Golden-path and failure-path tests required for each payment state transition.

### 10.3 Critical regression packs
- Subscription renewals and cancellations.
- Refunds and entitlement revocation/retention logic.
- Offline grace period expiry and reactivation.
- Usage cap enforcement correctness (if token billing enabled).

---

## 11. Risks and mitigations

- **Pricing complexity risk:** start with minimal plan set, validate with beta.
- **Support burden risk:** ship admin tooling before public launch.
- **Compliance risk:** legal review before collecting payment details.
- **Entitlement outage risk:** cache last-known-good entitlement and apply grace windows.
- **Scope creep risk:** defer enterprise and team features until post-launch milestones.

---

## 12. Open decisions

1. Which launch model is primary: subscription-first or BYOK lifetime-first?
2. Should hosted token billing launch at GA or post-GA?
3. What offline entitlement grace duration is acceptable (e.g. 7/14/30 days)?
4. What is included in lifetime (updates forever vs major-version window)?
5. Which regions/currencies are in initial launch scope?
6. What support SLA is promised by tier?

---

## 13. Launch readiness checklist

- [ ] Production domain, TLS, and monitoring configured.
- [ ] Auth, billing, entitlements, and webhook retries tested in staging.
- [ ] Terms/privacy and refund policy published.
- [ ] Incident response and support runbooks documented.
- [ ] Analytics dashboards validated.
- [ ] Manual fallback procedures tested for payment or entitlement failures.

