# ADR 006 — Deployment (Vercel + Render + Neon)

- **Status:** Accepted
- **Date:** 2026

## Context

LifeOS is a personal product that should be publicly reachable at low cost, with automatic deploys
and no infrastructure maintenance.

## Problem

Where to host the web app, the API and the database so auth cookies work, migrations run safely,
and the free-tier limits are acceptable.

## Decision

Use three managed services (all free tier):

```
Web        → Vercel    (static SPA; rewrites /v1/* to the API, /docs served by the API host)
API        → Render    (Node; render.yaml: build + `node dist/server.js`; migrations pre-deploy)
Database   → Neon      (managed PostgreSQL; connection string via DATABASE_URL)
```

- The web calls the API **same-origin** through a Vercel rewrite (`/v1/:path*`), which is what
  makes the `SameSite=Strict`/`Secure` cookies work (ADR 003).
- Render runs `prisma migrate deploy` in `preDeployCommand` before the new version starts and
  health-checks `/v1/health/ready`.
- A GitHub Actions **keep-alive** pings `/v1/health` so the free API instance doesn't sleep.
- HTTPS is provided automatically by Vercel/Render; custom domains are configured in the
  dashboards (`ALLOWED_ORIGINS` is set accordingly on Render).

## Alternatives considered

- **Single server (VPS)** — rejected: more ops (HTTPS, process management, backups) than a
  personal project needs.
- **API on Vercel serverless** — rejected: long-running Fastify + DB pooling fits a persistent
  Node process better on Render's free plan.
- **DB inside the API host** — rejected: Neon's managed Postgres includes backups/restore.

## Trade-offs

- Three providers to manage; env vars are spread across two dashboards (`ALLOWED_ORIGINS`,
  `DATABASE_URL`, `JWT_SECRET` on Render; `VITE_SENTRY_DSN` on Vercel).
- Free-tier limits (sleep after inactivity, cold starts) — mitigated by the keep-alive.
- `/docs` (Swagger UI) is only reachable on the API host because the web rewrite covers `/v1`
  only — acceptable for a dev-facing contract.

## Consequences

- Deploys are automatic on push to `main` (CI gates with lint/test/build first).
- Full environment variables and rollback steps are in `docs/ops/DEPLOYMENT.md` and
  `docs/ops/OPS.md`.
