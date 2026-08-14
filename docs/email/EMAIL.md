# LifeOS — Transactional Email Infrastructure

> Result of **Phase 2 — Transactional Email Infrastructure**
> (see [`docs/roadmap/1.6_ROADMAP.md`](../roadmap/1.6_ROADMAP.md)).

## Provider

LifeOS sends transactional emails through the **official Gmail SMTP server**, using a dedicated
central account:

- **Sending account:** `noreplylifeos.focus@gmail.com`
- **Reply-to:** `noreplylifeos.focus+support@gmail.com` — Gmail ignores everything after `+`, so
  replies land in the same inbox but are routed to the support sub-address.
- **Limits:** free tier, up to 500 emails/day, high deliverability via Google's infrastructure.
- **No custom domain or paid platform required** — SPF/DKIM/DMARC are already handled by Gmail for
  `gmail.com` addresses.

Credentials are a Gmail **app password** (2FA required on the account) — never the account's
normal login password.

## Environment variables

All defined in `apps/api/.env.example` and set in `render.yaml` (secrets via `sync: false`):

| Variable | Purpose |
|---|---|
| `EMAIL_ENABLED` | `false` (default) = **dry-run**: emails are rendered and logged, never sent. `true` = real sending. |
| `EMAIL_HOST` | SMTP host (default `smtp.gmail.com`) |
| `EMAIL_PORT` | SMTP port (default `465`) |
| `EMAIL_SECURE` | TLS on connect (default `true`) |
| `EMAIL_USER` | SMTP username (the Gmail account) |
| `EMAIL_PASS` | Gmail **app password** |
| `EMAIL_FROM_NAME` | Display name in the From header (default `LifeOS`) |
| `EMAIL_FROM_ADDRESS` | From address (defaults to `EMAIL_USER`) |
| `EMAIL_REPLY_TO` | Reply-To header (defaults to `EMAIL_USER`) |
| `WEB_URL` | Public web origin used to build email links (e.g. `https://lifeos.app`) |

> **Safety:** `EMAIL_ENABLED=false` is the default. Development and CI never contact an SMTP
> server; the service logs `[email][dry-run] ...` instead. Only flip it to `true` with real
> credentials in place.

## Service abstraction

The code lives in `apps/api/src/lib/email/`:

| File | Responsibility |
|---|---|
| `email.types.ts` | `EmailTemplate` union, `SendEmailInput`, `MailTransport` contract, `EmailService` interface |
| `email.config.ts` | Reads the `EMAIL_*` env vars into a typed `EmailConfig` |
| `email.templates.ts` | Base HTML layout + plain-text fallback + a renderer per template |
| `email.service.ts` | `createEmailService()` — nodemailer SMTP adapter, retry, failure logging, dry-run mode |

The service is exposed on the Fastify instance as `fastify.emailService` (decorated by
`apps/api/src/plugins/email.ts`), so any route can send mail. `buildApp({ emailService })` accepts
an injected service for tests (tests always force `EMAIL_ENABLED=false` via `vitest.setup.ts`).

The `EmailService` interface is **provider-independent**:

```ts
interface EmailService {
  send({ to, template, data, locale? }: SendEmailInput): Promise<void>;
}
```

Switching providers later only means swapping the transport in `createEmailService()` — no domain
code changes.

### Behaviour

- **Retry:** a send is retried once (2 attempts total) on transient failure.
- **Failure logging:** on final failure the error is rethrown and logged with the template +
  recipient only — **never** the payload (links/tokens are not written to logs).
- **Dry-run:** when `EMAIL_ENABLED=false`, `send` renders and logs the email but never contacts
  the SMTP server.

### Email template design

The shared HTML layout follows the LifeOS brand (see `apps/web/src/index.css`):

- **Header:** the LifeOS brand name as text (bold) — no image, so it renders reliably in every
  email client (Gmail blocks external images by default).
- **Colours:** brand indigo (`#6366f1`) CTA with white text and `border-radius: 6px`; zinc
  foreground (`#18181b`), muted footer text, neutral page background `#f8f9fa`.
- **Layout:** the white card is centered, all content left-aligned, generous padding, a subtle
  divider above the footer, and clean footer links (Privacy Policy / Support).
- **Long links** in the HTML are wrapped with `word-break: break-all`; the fallback link shows only
  the host to avoid breaking the card width.

## Email verification (Phase 3)

- Registration creates an **unverified** user (`emailVerified=false`) and does **not** send any
  email. No token is created at registration.
- The verification email is sent **only when the user requests it** via the `/verify-email` page
  (which calls `POST /v1/auth/resend-verification`). This issues a single-use
  `EmailVerificationToken` (SHA-256 hash stored, 24 h TTL) and sends the `verify-email` template.
- `POST /v1/auth/verify-email` marks the email verified exactly once (token deleted on success).
- `POST /v1/auth/resend-verification` always returns the same generic message (no account
  enumeration) and is rate-limited (default 3/hour).
- **Access policy (Option B):** unverified users can log in and see a persistent "Verify your
  email" banner. They are restricted to **pillars and habits** (setup). Goals, projects, daily
  logs, statistics, insights and progression are blocked (`403 EMAIL_NOT_VERIFIED` via the
  `requireVerified` guard) until the email is confirmed — the sidebar hides those routes too.
- After verification the user is automatically redirected to the dashboard; `/verify-email` is no
  longer accessible for a verified account.
- Links are built from `WEB_URL` (default `https://lifeos.app`).

## Password recovery (Phase 4)

- `POST /v1/auth/forgot-password` always responds the same way (anti-enumeration) and runs
  equivalent work so the response time doesn't reveal whether the email is registered.
- A single-use `PasswordResetToken` (SHA-256 hash stored, **1 h TTL**) is issued; requesting again
  invalidates any previous one. The demo account never receives reset links.
- `POST /v1/auth/reset-password` validates the token + new password (Phase 1 policy), bumps
  `passwordChangedAt`, invalidates **all** old sessions/JWTs, and sends the `password-changed`
  security notification.
- `requireAuth` rejects any JWT issued before `passwordChangedAt` — forces a fresh login everywhere.
- Both endpoints are rate-limited (default 3/h forgot, 10/h reset).

## Change password & change email (Phase 5)

- `POST /account/change-password` requires the **current password**, validates the new one with the
  Phase 1 policy and bumps `passwordChangedAt`. The current session gets a fresh JWT (stays active);
  all other sessions are invalidated. Sends the `password-changed` notification.
- `POST /account/change-email/request` (verified users) requires the current password, creates a
  single-use `EmailChangeToken` (1 h TTL, confirm + cancel hashes) and sends the
  `email-change-request` (new address) + `email-change-alert` (old address, with a cancel link).
  If the new email already belongs to another account, it responds generically and sends nothing
  (anti-enumeration).
- `POST /account/change-email/confirm` finalizes the change (email stays verified), invalidates
  other sessions and sends the `email-changed` notification to both addresses.
- Cancellation is possible via `DELETE /account/change-email/cancel` (authenticated) or
  `POST /account/change-email/cancel` (no-login link token from the old email).

## Supported templates & expected data

| Template | Data fields |
|---|---|
| `verify-email` | `verificationUrl` (string) |
| `password-reset` | `resetUrl` (string) |
| `password-changed` | — (notification only) |
| `email-change-request` | `confirmUrl` (string) — sent to the **new** address |
| `email-change-alert` | `cancelUrl` (string) — sent to the **old** address |
| `email-changed` | — (final confirmation, sent to both addresses) |
| `account-deletion-requested` | `recoveryUrl` (string), `deletionDate` (string, YYYY-MM-DD) |
| `account-deletion-reminder` | `recoveryUrl` (string), `deletionDate` (string, YYYY-MM-DD) |
| `account-deleted` | — (notification only) |

Every template renders an HTML version (shared LifeOS header/footer layout) and a plain-text
fallback. The `locale` field is accepted but not yet used — localization lands in Phase 7.

## Tests

`email.test.ts` runs with a **mocked transport** — no test ever sends a real email. It covers:

- Config parsing and From-header formatting.
- Rendering of all 8 templates (HTML + plain text) and HTML escaping.
- Dry-run mode does not call the transport.
- Successful send with correct From/Reply-To/To.
- Retry-once-on-failure and give-up-after-limit (payload never logged).

---

_More docs: [Documentation index](../README.md) · [1.6 roadmap](../roadmap/1.6_ROADMAP.md) · [Deployment](../ops/DEPLOYMENT.md)_
