# LifeOS — Transactional Email Infrastructure

> Result of **Phase 2 — Transactional Email Infrastructure**
> (see [`docs/roadmap/v1.6_ACCOUNT_SECURITY.md`](../roadmap/v1.6_ACCOUNT_SECURITY.md)).

## Provider

LifeOS sends transactional emails through the **official Gmail**, using a dedicated central
account. Two transports are supported:

- **Gmail REST API over HTTPS** (`EMAIL_PROVIDER=gmail-api`, default in production) — used when the
  SMTP egress is blocked. Gmail SMTP drops connections from datacenter IPs (e.g. free Render
  instances), so production uses the REST API on port 443 instead, authenticated with OAuth2.
- **Gmail SMTP** (`EMAIL_PROVIDER=smtp`, default locally) — classic SMTP with an app password.

Account facts:

- **Sending account:** `noreplylifeos.focus@gmail.com`
- **Reply-to:** `noreplylifeos.focus+support@gmail.com` — Gmail ignores everything after `+`, so
  replies land in the same inbox but are routed to the support sub-address.
- **Limits:** free tier, up to 500 emails/day, high deliverability via Google's infrastructure.
- **No custom domain or paid platform required** — SPF/DKIM/DMARC are already handled by Gmail for
  `gmail.com` addresses.

## Environment variables

All defined in `apps/api/.env.example` and set in `render.yaml` (secrets via `sync: false`):

| Variable | Purpose |
|---|---|
| `EMAIL_ENABLED` | `false` (default) = **dry-run**: emails are rendered and logged, never sent. `true` = real sending. |
| `EMAIL_PROVIDER` | `smtp` (default) or `gmail-api` (HTTPS transport) |
| `EMAIL_HOST` | SMTP host (default `smtp.gmail.com`) — only used by `smtp` |
| `EMAIL_PORT` | SMTP port (default `465`) — only used by `smtp` |
| `EMAIL_SECURE` | TLS on connect (default `true`) — only used by `smtp` |
| `EMAIL_USER` | The Gmail account / SMTP username |
| `EMAIL_PASS` | Gmail **app password** — only used by `smtp` |
| `EMAIL_FROM_NAME` | Display name in the From header (default `LifeOS`) |
| `EMAIL_FROM_ADDRESS` | From address (defaults to `EMAIL_USER`) |
| `EMAIL_REPLY_TO` | Reply-To header (defaults to `EMAIL_USER`) |
| `WEB_URL` | Public web origin used to build email links (e.g. `https://lifeos-focus.vercel.app`) |
| `GOOGLE_OAUTH_CLIENT_ID` | Gmail API OAuth2 client id — only used by `gmail-api` |
| `GOOGLE_OAUTH_CLIENT_SECRET` | Gmail API OAuth2 client secret — only used by `gmail-api` |
| `GOOGLE_OAUTH_REFRESH_TOKEN` | Gmail API OAuth2 refresh token — only used by `gmail-api` |
| `GOOGLE_OAUTH_USER` | Gmail address sent as `me` (defaults to `EMAIL_USER`) — only used by `gmail-api` |

> **Safety:** `EMAIL_ENABLED=false` is the default. Development and CI never contact an SMTP
> server; the service logs `[email][dry-run] ...` instead. Only flip it to `true` with real
> credentials in place.

## Gmail API transport (OAuth2)

To use `EMAIL_PROVIDER=gmail-api`:

1. Create a Google Cloud project and an **OAuth 2.0 Client ID** (type: Web/Desktop) at
   <https://console.cloud.google.com/apis/credentials>.
2. Enable the **Gmail API** for the project (API Library → Gmail API → Enable).
3. Add the scope `https://mail.google.com/` to the OAuth consent screen (External user type).
4. Obtain a **refresh token** (e.g. with `google-auth-cli` or the OAuth playground):
   - Authorization URL: `https://accounts.google.com/o/oauth2/auth?access_type=offline&prompt=consent&scope=https://mail.google.com/&client_id=...&redirect_uri=...`
   - Exchange the code at `https://oauth2.googleapis.com/token` for `refresh_token`.
5. Set the env vars in the Render dashboard:
   `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GOOGLE_OAUTH_REFRESH_TOKEN`,
   `GOOGLE_OAUTH_USER`, plus `EMAIL_PROVIDER=gmail-api` and `EMAIL_ENABLED=true`.

The transport builds the RFC822 message with nodemailer's `jsonTransport` and submits it to
`https://gmail.googleapis.com/gmail/v1/users/me/messages/send` with a short-lived bearer token
obtained from the refresh token. No SMTP TCP ports are involved.

## Service abstraction

The code lives in `apps/api/src/lib/email/`:

| File | Responsibility |
|---|---|
| `email.types.ts` | `EmailTemplate` union, `SendEmailInput`, `MailTransport` contract, `EmailService` interface |
| `email.config.ts` | Reads the `EMAIL_*` + `GOOGLE_OAUTH_*` env vars into a typed `EmailConfig` |
| `email.templates.ts` | Base HTML layout + plain-text fallback + a renderer per template |
| `email.service.ts` | `createEmailService()` — transport selection (SMTP or Gmail API), retry, failure logging, dry-run mode |
| `gmail-api.transport.ts` | `createGmailApiTransport()` — OAuth2 refresh + Gmail REST send over HTTPS |

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

### Network hardening (SMTP over IPv6 / slow connections)

Gmail's `smtp.gmail.com` resolves to **IPv6** addresses first. On hosts without an IPv6 route
(e.g. Render free instances) the SMTP connect fails with `ENETUNREACH` and emails are never sent.
The transport in `email.service.ts`:

- **Resolves the host to an IPv4 literal up front** (`dns.promises.resolve4`) and passes that IP as
  `host` to nodemailer. Nodemailer treats a literal IP via `net.isIP` and **skips its own DNS
  resolution** — which otherwise resolves both A and AAAA records and tries IPv6 first. The real
  hostname is kept as `servername` so SNI / TLS certificate validation still uses
  `smtp.gmail.com`.
- **Short timeouts** (`connectionTimeout`/`greetingTimeout` 10 s, `socketTimeout` 15 s). The
  nodemailer default is 2 minutes per attempt; with the built-in retry that blocked the request for
  ~4 minutes before failing, which also consumed the `resend-verification` rate limit without ever
  sending an email. With short timeouts a failure surfaces in seconds.

### STARTTLS fallback (port 465 → 587)

Some hosts (notably free Render instances) cannot reach Gmail's **465** (implicit TLS) port but
accept **587** (STARTTLS). When `EMAIL_PORT=465` and the SMTP connection fails with a
**connection-level** error (`ETIMEDOUT`, `ENETUNREACH`, `ECONNREFUSED`, `Connection timeout`, …),
the service automatically retries the send over port 587 with `secure: false`.

- **Credentials errors are never retried** — a `535` / `EAUTH` failure means the app password is
  wrong, and retrying on another port would not help.
- When `EMAIL_PORT` is already `587`, no fallback is built.
- Covered by `email.test.ts` → "SMTP STARTTLS fallback (465 → 587)".

### Common production failure symptoms

| Symptom | Cause | Fix |
|---|---|---|
| `connect ENETUNREACH <ipv6>:465/587` | No IPv6 route on the host | resolve to an IPv4 literal (already applied) |
| `Connection timeout` after ~2 min | Default nodemailer timeout | short timeouts (already applied) |
| `ETIMEDOUT` / `ENETUNREACH` on `465` but works on `587` | Port 465 blocked by the host network | automatic STARTTLS fallback (already applied) |
| `Connection timeout` / `ENETUNREACH` on every SMTP port | Gmail drops datacenter SMTP (e.g. Render free) | use `EMAIL_PROVIDER=gmail-api` (HTTPS, already applied in production) |
| Email received with `localhost` links | `WEB_URL` unset → `http://localhost:5173` fallback | set `WEB_URL` to the public origin in Render |
| `429 RATE_LIMIT_EXCEEDED` on resend | Slow failed sends consumed the 3/h limit | fix the send; `resend-verification` allows 3/h on purpose |

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

## Account soft-delete (Phase 6)

- `POST /account/delete` (verified users) requires the current password, sets `status =
  PENDING_DELETION`, schedules deletion in **15 days**, issues a single-use recovery token and
  invalidates all sessions (the token cookie is cleared).
- During the grace period the user can still log in, but only sees the recovery screen
  (`ACCOUNT_PENDING_DELETION` on protected routes). Recovery is idempotent:
  - Path A: `POST /account/recover` with the single-use email-link token (no login).
  - Path B: `POST /account/cancel-deletion` from the post-login recovery screen.
- A daily job (`pnpm --filter @lifeos/api jobs:process-account-deletions`) permanently deletes
  accounts whose window elapsed — the `account-deleted` email is sent first, then the user row is
  hard-deleted (cascading to all data) and an anonymized `{ userIdHash, deletedAt }` audit event is
  logged. Idempotent.

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
| `account-recovered` | — (recovery confirmation) |

 Every template renders an HTML version (shared LifeOS header/footer layout) and a plain-text
 fallback. The `locale` field selects the copy language — **en**, **pt** and **uk** are supported,
 falling back to **en** for any other value. The user's `User.locale` is passed at send time, so a
 user who speaks Portuguese receives localized verification, reset, change, deletion and recovery
 emails. Copy lives in `apps/api/src/lib/email/i18n/{en,pt,uk}.json`.

## Tests

`email.test.ts` runs with a **mocked transport** — no test ever sends a real email. It covers:

- Config parsing and From-header formatting.
- Rendering of all 8 templates (HTML + plain text) and HTML escaping.
- Localized rendering in `pt`/`uk` (subjects, body and the `<html lang>` attribute) and fallback to English.
- Dry-run mode does not call the transport.
- Successful send with correct From/Reply-To/To.
- Retry-once-on-failure and give-up-after-limit (payload never logged).

---

_More docs: [Documentation index](../README.md) · [1.6 roadmap](../roadmap/v1.6_ACCOUNT_SECURITY.md) · [Deployment](../ops/DEPLOYMENT.md)_
