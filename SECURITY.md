# Security Policy

LifeOS takes security seriously. This page explains how to report a security issue and what you
can expect from us. For the technical security posture (auth, sessions, CSRF, rate limits, data
isolation, …), see the [security audit & data-isolation checklist](docs/SECURITY_AUDIT.md).

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security problems — that reveals the flaw to
everyone before it can be fixed.

Instead, report privately:

- **Email:** `vvasconcelos.dev@gmail.com`
- **GitHub Security Advisory:** <https://github.com/vvasconceloss/lifeos/security/advisories/new>

Include as much detail as you safely can:

- A short description of the vulnerability and its impact.
- Steps to reproduce (or a minimal proof-of-concept).
- Affected component(s) and version(s).
- Any suggested fix, if you have one.

## What happens next

1. **Acknowledgment** — we'll confirm receipt of your report within **72 hours**.
2. **Triage** — we assess severity and impact, and coordinate on a fix.
3. **Fix & release** — a fix is shipped, usually as a patch or in the next release.
4. **Disclosure** — we publish an advisory once the fix is available, crediting you unless you
   prefer to stay anonymous.

We ask researchers to give us a reasonable window (by default **90 days**) before public disclosure,
so users have time to upgrade.

## Scope

In scope: the LifeOS web app (`apps/web`), API (`apps/api`) and shared packages
(`packages/shared`) in this repository, and the deployed services (Vercel, Render, Neon).

Out of scope: third-party services, the demo account, and anything not part of this repository's
codebase.

## Security best practices

- **No secrets in code** — `.env` is git-ignored; environment variables are set via the platform
  (Vercel/Render).
- **Passwords** are hashed with `bcrypt` (10 rounds); plaintext is never stored or logged.
- **Tokens** (verification, reset, email change, deletion) are random, single-use, expiring, and
  only their SHA-256 hash is stored.
- **Sessions** are `HttpOnly`, `SameSite=Strict` cookies; expired/invalidated after sensitive
  account changes.
- **Dependency audit** runs in CI (`pnpm audit --prod`) and must stay clean.

See the [security audit](docs/SECURITY_AUDIT.md) for the full checklist and test coverage.
