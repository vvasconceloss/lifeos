# LifeOS — Operations Guide

Production-hardening reference for running the LifeOS API and web app (Phase 12 of [`1.5_PLAN.md`](1.5_PLAN.md)).

## Architecture

```text
Web app (Vite/React)  →  API (Node/Fastify)  →  Managed PostgreSQL
```

- **API** runs as a long-lived Node process (`node dist/server.js`, built with `tsup`).
- **Web** is a static build served by any static host / CDN.
- **Database** should be a managed PostgreSQL (automatic backups, TLS, connection handling).

## Environment & credentials

- Copy `apps/api/.env.example` → `apps/api/.env`. **Never commit `.env`.**
- `JWT_SECRET` must be a long random value in production (`openssl rand -hex 32`).
- `ALLOWED_ORIGINS` must list the exact web origins (comma-separated). A wildcard is **rejected** on purpose.
- Set `NODE_ENV=production` — this flips the auth cookie to `Secure` (`SameSite=Strict`, `HttpOnly`).
- See `.env.example` for every variable (rate limits, log level, host/port).

## Migrations

Migrations are applied explicitly on deploy — never automatically at boot.

```bash
pnpm --filter @lifeos/api migrate:deploy
```

The Prisma schema is the source of truth (`apps/api/prisma/schema.prisma`). Each migration is a plain SQL file under `apps/api/prisma/migrations/` and is idempotent-safe because `migrate deploy` only applies pending ones. Always run this **before** starting the new API version.

## Backups

Managed PostgreSQL normally provides automatic backups. If you run your own instance, use `pg_dump` on a schedule:

```cron
# Nightly at 02:30 UTC — keep 14 daily + 4 weekly
30 2 * * * pg_dump "$DATABASE_URL" | gzip > /backups/lifeos-$(date +\%F).sql.gz
# prune old files
0 4 * * * find /backups -name 'lifeos-*.sql.gz' -mtime +14 -delete
```

Restore:

```bash
gunzip -c /backups/lifeos-2026-08-08.sql.gz | psql "$DATABASE_URL"
```

Test the restore procedure at least once before relying on it.

## Connection pooling

The API uses Prisma with the `pg` adapter (`@prisma/adapter-pg`), which owns a `pg.Pool` per process. Defaults are fine for a single instance; tune via the `DATABASE_URL` connection params if you run more instances or hit pool exhaustion:

```text
postgresql://user:pass@host/db?pool_size=10&connect_timeout=5
```

Keep the pool small (≤ number of `MAX_CONNECTIONS` on the server divided by the number of API instances).

## Logging & observability

- Structured JSON logs via Fastify/pino. `LOG_LEVEL` controls verbosity (`info` default).
- Every log line carries a `reqId` (UUID); the API echoes it in the **`x-request-id`** response header so requests can be correlated end-to-end from the client to the logs.
- Sensitive headers (`cookie`, `authorization`, `set-cookie`) are redacted as `[redacted]`.
- Requests are logged automatically with method, route, status and latency.
- Process-level handlers log `uncaughtException` / `unhandledRejection`.

## Health checks

- `GET /v1/health` — liveness, always `{ status: "ok" }`.
- `GET /v1/health/ready` — readiness, runs `SELECT 1` against the DB; returns **503** when the database is unreachable.

Point your load balancer / container orchestrator at `/v1/health/ready`.

## Graceful shutdown

The API handles `SIGINT`/`SIGTERM`: it stops accepting connections, closes the Fastify server, disconnects Prisma, then exits. A second signal forces exit. Deploy orchestration should send `SIGTERM` and wait.

## Security checklist (already enforced)

| Control | Status |
|---|---|
| Rate limiting — global + login (5/min) + register (10/min) | ✅ `@fastify/rate-limit` |
| Secure cookies — `HttpOnly`, `SameSite=Strict`, `Secure` in production | ✅ |
| CORS — explicit origins from `ALLOWED_ORIGINS`, wildcard rejected | ✅ |
| Security headers — `@fastify/helmet` (CSP off: JSON API only) | ✅ |
| CSRF protection on state-changing requests | ✅ `@fastify/csrf-protection` |
| Password rules — min 8 chars, at least one letter + one number, max 72 | ✅ Zod schema |
| Input validation on every endpoint (incl. Goals, Daily Logs, Onboarding) | ✅ `validateInput` |
| Authorization — every query scoped by `userId` across all entities | ✅ audited + tests |
| Secrets — never in code; `.env` git-ignored; `.env.example` documented | ✅ |
| Dependency audit | ✅ `pnpm audit` clean (prod + dev); pinned patched transitive versions via `pnpm-workspace.yaml` `overrides` |

## Deployment checklist (production)

Full production setup (Render API, Vercel web, Neon Postgres, env vars, CI/CD and rollback) is in
[`DEPLOYMENT.md`](DEPLOYMENT.md).

1. `pnpm install --frozen-lockfile`
2. `pnpm lint && pnpm --filter @lifeos/api test && pnpm build`
3. `pnpm --filter @lifeos/api migrate:deploy`
4. Start the API: `pnpm --filter @lifeos/api start` (with production env vars)
5. Build + deploy the web static bundle (`pnpm --filter @lifeos/web build`)
6. Verify `GET /v1/health/ready` → `{ status: "ok", db: "ok" }`
7. Smoke test: register → onboarding → create a habit → mark completion
