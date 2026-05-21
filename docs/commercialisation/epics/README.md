# Epic index (commercialisation)

Each epic file lists **user stories**, **acceptance criteria**, **primary code areas**, and **TDD notes**. Implementation order follows [`../implementation-plan.md`](../implementation-plan.md).

| ID | File | Summary |
|----|------|---------|
| E00 | [`E00-foundation.md`](E00-foundation.md) | Vendors, environments, entitlement schema, programme governance. |
| E01 | [`E01-control-plane-backend.md`](E01-control-plane-backend.md) | New control-plane service: auth integration, billing webhooks, entitlement API, persistence. |
| E02 | [`E02-web-commercial-surfaces.md`](E02-web-commercial-surfaces.md) | Marketing, auth UI, pricing, checkout hand-off, account/billing, paywalls in `packages/web`. |
| E03 | [`E03-bridge-desktop-entitlements.md`](E03-bridge-desktop-entitlements.md) | Entitlement refresh, grace periods, `packages/bridge`, `apps/dev-bridge`, `apps/desktop-macos`. |
| E04 | [`E04-ops-legal-admin.md`](E04-ops-legal-admin.md) | Hosting, observability, incident response, legal pages, admin/support tooling. |
| E05 | [`E05-usage-metering.md`](E05-usage-metering.md) | Post-GA optional: token ledger, quotas, hosted AI billing (`packages/llm` + control plane). |
