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

## Supported templates & expected data

| Template | Data fields |
|---|---|
| `verify-email` | `verificationUrl` (string) |
| `password-reset` | `resetUrl` (string) |
| `password-changed` | — (notification only) |
| `email-change-request` | `confirmUrl` (string) — sent to the **new** address |
| `email-change-alert` | `cancelUrl` (string) — sent to the **old** address |
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
