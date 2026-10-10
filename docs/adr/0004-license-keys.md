# ADR 0004 — OGE UI Pro: sales, license keys and the runtime check

- **Status:** Accepted
- **Date:** 2026-10-10
- **Decided by:** product owner (payment provider, pricing model, enforcement level, price, packaging), implementation by the maintainers
- **Related:** ADR 0003 (commercial engine packages), `docs/ARCHITECTURE.md` → Licensing

## Context

Since 0.6.0 six families (pivot, bpmn, scheduler, gantt, kanban, charts) have
been source-available commercial — free for evaluation and development, paid
for production. Until now there was no way to buy a license and no runtime
signal at all; READMEs promised "no watermark, no runtime license checks". The
license text alone gives no nudge to the many teams that ship without
noticing the terms.

## Decisions

1. **Merchant of record: Lemon Squeezy.** It handles VAT, invoices and tax
   remittance worldwide, which matters for a seller in Türkiye.
2. **One product, OGE UI Pro: $299 per developer per year**, covering all six
   families in both render layers. Seats count developers, not apps, servers
   or end users.
3. **Perpetual fallback.** A key covers every release dated on or before its
   `expires` day, forever; renewing extends the window to later releases.
4. **Offline-verified signed keys.** `OGE1.<base64url JSON>.<Ed25519 sig>`,
   checked with Web Crypto against a public key embedded in `@oge-ui/core`.
   No network call, no phone-home, nothing to break when a licensing server is
   down. Where a browser cannot verify Ed25519, a well-formed key is trusted.
5. **Enforcement: console warning + corner notice, never degradation.**
   Without a valid key on a production host the component works in full; the
   page gets one warning per family and one small "OGE UI Pro — unlicensed"
   link. Development hosts and test runtimes get nothing.
6. **Key delivery: self-service claim.** `/license/claim` sends the order
   number and email to `api/license/claim.mjs`, which reads the order from the
   Lemon Squeezy API and signs the key. The same order always yields an
   equivalent key, so a lost key is claimed again; no email provider or
   database is needed.

## Options considered

- **Paddle** (more enterprise-oriented, longer onboarding) and **Stripe**
  (lowest fees, but tax and invoicing on us) — not chosen.
- **Per-family pricing** — more products and keys to manage for little gain at
  this stage; the key payload still carries `families`, so it stays possible.
- **Console-only or honour system** — too weak a nudge; **feature limits or
  hard blocks** — hostile to evaluation and to paying customers on a bad day.
- **Lemon Squeezy's own license keys** — random strings validated online;
  rejected because the check must work offline and without a server.

## Consequences

- The private signing key is the one secret of the scheme. It lives outside
  the repository; rotating it means shipping a new public key and re-issuing
  keys (the `OGE1` prefix leaves room for a new format).
- The check can be removed by anyone editing the source, as with every
  JavaScript license check; it targets honest teams, and the license text
  remains the legal basis.
- READMEs and docs pages that promised "no watermark, no runtime license
  checks" were updated in the same change; releases before 1.1.5 have no check.
