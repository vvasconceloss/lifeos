# LifeOS — Deployment

How LifeOS is deployed and configured for production (Phase 14 of [`v1.5_PUBLIC_BETA.md`](../roadmap/v1.5_PUBLIC_BETA.md)).

## Architecture

```text
Browser
   │  https://your-app.vercel.app  (same origin — cookies work)
   ▼
Vercel (static web, free plan)
   │  rewrites /v1/*  →  Render API
   ▼
Render (Node/Fastify API, free plan)
   │  pre-deploy: prisma migrate deploy
   ▼
Neon (managed PostgreSQL, free plan)
```

Keeping `/v1/*` **same-origin** via a Vercel rewrite (instead of calling the API cross-origin)
is what makes the auth cookies (`HttpOnly`, `SameSite=Strict`, `Secure`) work in production.

## Repository configuration

- **`render.yaml`** — Render blueprint for the API: builds the `@lifeos/api` package, starts
  `node dist/server.js`, runs **migrations automatically before each deploy**
  (`preDeployCommand: pnpm --filter @lifeos/api migrate:deploy`), and uses `/v1/health/ready` as the
  health-check path (liveness + DB).
- **`vercel.json`** (in `apps/web`, the Vercel project root directory) — build
  (`buildCommand: pnpm build`, i.e. `tsc -b && vite build`, output `dist`), a rewrite of `/v1/:path*`
  to the Render API, and an SPA catch-all rewrite to `index.html`.
- **`.github/workflows/ci.yml`** — CI on every PR and on push to `main`: install → Prisma generate →
  migrations → `lint` → `test` (API + Web + E2E main flow) → `build`. Merge to `main` requires CI
  green (enable branch protection in GitHub settings).

## Environment variables

### Render (API)

Set these in the Render dashboard (or they come from `render.yaml`):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` (free plan sets it automatically) |
| `DATABASE_URL` | Neon connection string, e.g. `postgresql://user:pass@ep-xxx.aws.neon.tech/lifeos?sslmode=require` |
| `JWT_SECRET` | long random value (`openssl rand -hex 32`) |
| `ALLOWED_ORIGINS` | the Vercel origin, e.g. `https://your-app.vercel.app` |
| `LOG_LEVEL` | `info` |
| `RATE_LIMIT_MAX` / `RATE_LIMIT_WINDOW` | `300` / `1 minute` |
| `LOGIN_RATE_LIMIT_MAX` / `LOGIN_RATE_LIMIT_WINDOW` | `5` / `1 minute` |
| `REGISTER_RATE_LIMIT_MAX` / `REGISTER_RATE_LIMIT_WINDOW` | `10` / `1 minute` |
| `EMAIL_ENABLED` | `true` only once real Gmail app-password credentials are set (see `docs/email/EMAIL.md`) |
| `EMAIL_HOST` / `EMAIL_PORT` / `EMAIL_SECURE` | `smtp.gmail.com` / `465` / `true` |
| `EMAIL_USER` | `noreplylifeos.focus@gmail.com` (SMTP username) |
| `EMAIL_PASS` | Gmail app password (secret) |
| `EMAIL_FROM_NAME` / `EMAIL_FROM_ADDRESS` | `LifeOS` / `noreplylifeos.focus@gmail.com` |
| `EMAIL_REPLY_TO` | `noreplylifeos.focus+support@gmail.com` |
| `WEB_URL` | web origin used to build verification/reset links, e.g. `https://your-app.vercel.app` |
| `RESEND_VERIFICATION_RATE_LIMIT_MAX` / `_WINDOW` | `3` / `1 hour` |

### Vercel (web)

| Variable | Value |
|---|---|
| `VITE_SENTRY_DSN` *(optional)* | enables browser error tracking |

The Vercel project's **Root Directory is `apps/web`** and its `vercel.json` already points the
`/v1/*` rewrite at the real Render URL (`https://lifeos-i59v.onrender.com/v1/:path*`).

> **Note on API error tracking:** the server keeps a clean dependency audit
> (`pnpm audit --prod` → no vulnerabilities). `@sentry/node` currently pulls a vulnerable
> `@opentelemetry/core@1.x` with no 1.x patch, so the API relies on structured pino logs (Phase 12)
> instead. Re-enable server-side Sentry once a patched otel core 1.x is available.

## Database (Neon)

- Use the connection string from Neon with `?sslmode=require`.
- `?pool_size=N` can be added to tune the Prisma/pg pool for the free tier (a small pool like
  `pool_size=5` is safe).
- Migrations run automatically on Render deploys (`preDeployCommand`). Never run them from CI.

## Public demo account

The landing page's "View Demo" button logs straight into a shared demo account
(`demo@lifeos.com`). It is created on demand by `POST /v1/auth/demo` (rate-limited) and seeded
with realistic data (pillars, habits, completions, goals, projects, journal entries).

- Re-seed it manually with: `pnpm --filter @lifeos/api seed:demo`
- To refresh the demo data on every deploy, add `seed:demo` to the Render `preDeployCommand`
  (e.g. `pnpm --filter @lifeos/api migrate:deploy && pnpm --filter @lifeos/api seed:demo`).
- `DEMO_RATE_LIMIT_MAX` / `DEMO_RATE_LIMIT_WINDOW` tune the login rate limit (default 10/min).

## CI/CD flow

```text
Pull Request
     ↓
GitHub Actions: lint → test (API + Web + E2E) → build
     ↓  (branch protection requires it to pass)
Merge to main
     ↓
Render auto-deploys API (migrations first)  +  Vercel auto-deploys web
```

## Domain & HTTPS

- Render and Vercel provide HTTPS certificates automatically.
- Custom domains are added in the respective dashboards (set `ALLOWED_ORIGINS` accordingly on Render).
- No certificate management in the repo is needed.

## Monitoring & error tracking

- **Uptime:** Render's health check pings `/v1/health/ready`. For external uptime monitoring, point
  a free service (e.g., UptimeRobot) at `https://<api>/v1/health/ready`.
- **Errors:** the web uses opt-in Sentry (`VITE_SENTRY_DSN`, no-op without it). The API logs
  structured errors via pino (see the note above on server-side Sentry).

## First deploy & rollback checklist

1. Create the Neon DB and copy `DATABASE_URL`.
2. Create the Render web service from `render.yaml` (or "New Blueprint"); set `DATABASE_URL`,
   `JWT_SECRET`, `ALLOWED_ORIGINS`.
3. Import the repo in Vercel with the Root Directory set to `apps/web` (its `vercel.json` already
   has the build command and the API rewrite); set `VITE_SENTRY_DSN` if wanted.
4. Test deploy: run the flow on the production URL — register → onboarding → create habit →
   complete habit → dashboard updates; log out and back in (cookies).
5. **Rollback:** both Render and Vercel keep previous deploys — use "Rollback to this deploy" in
   their dashboards if a bad release ships.

---

_More docs: [Documentation index](../README.md) · [Operations](../ops/OPS.md) · [LifeOS README](../README.md)_
