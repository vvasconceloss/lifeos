# LifeOS — Product & Onboarding Funnel

> Result of **Phase 9 — Product Polish**
> (see [`docs/roadmap/IMPROVE_ROADMAP.md`](../roadmap/IMPROVE_ROADMAP.md)).

## Onboarding funnel (conceptual)

```text
Landing                → public landing page (lifeos.app) with "View Demo"
   ↓
Demo                   → one-click public demo account, pre-loaded with realistic data
   ↓
Register               → create an account
   ↓
Onboarding completed   → first-run wizard (areas → first habits → ready)
   ↓
First habit            → user has at least one active habit
   ↓
First completion       → user marks a habit done for a day
   ↓
7-day retention        → the user comes back for a second week
```

## Instrumentation decision

**Not instrumented (deferred, with justification).** The funnel is defined conceptually so the
product can be measured later, but no analytics are enabled yet because:

- Traffic is low and the product is a personal portfolio project — event data would have no sample
  to be meaningful.
- No external analytics tool is configured (privacy-friendly: we deliberately don't add tracking).
- The events above map cleanly to existing backend operations, so they can be instrumented later
  with cheap structured logs (e.g. `auth.register`, `onboarding.completed`, first-habit /
  first-completion checks) without architectural changes.

This is an explicit, conscious decision rather than an oversight.

## Feedback mechanism (implemented)

A lightweight feedback path exists without building a full system:

- **GitHub issue templates** — `.github/ISSUE_TEMPLATE/bug.yml` and `feature.yml`.
- **In-app links** — the Profile page has a **Feedback** card with "Report a bug" and
  "Suggest a feature" buttons that open GitHub Issues with the matching template.

## Status page (discarded)

A public status page (Web / API / Database / last deployment) was evaluated and **discarded**:

- It would be overengineering for a single-user/personal deployment.
- The existing health checks already cover it operationally: `GET /v1/health/ready` (liveness +
  database), Render's health check, and the post-deploy smoke workflow.

This decision keeps the product lean, per the roadmap's "avoid overengineering" rule.

---

_More docs: [Documentation index](../README.md) · [LifeOS README](../../README.md)_
