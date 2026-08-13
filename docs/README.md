# LifeOS — Documentation

This is the entry point for LifeOS documentation. Start here to find what you need.

## Quick links

- **[LifeOS README](../README.md)** — product overview, features, setup, deploy.
- **[CHANGELOG](../CHANGELOG.md)** — v1.0 → v1.5 release history.

## Roadmap & backlog

| Document | What it is |
|---|---|
| [`roadmap/ROADMAP.md`](roadmap/ROADMAP.md) | The v1.5 roadmap: objectives, specs and the task backlog for every phase (audit, UX, frequencies, analytics, goals, projects, journal, personalization, onboarding, gamification, observability, testing, CI/CD, release). |
| [`roadmap/MVP_ROADMAP.md`](roadmap/MVP_ROADMAP.md) | The original v1.0 MVP plan (Foundation → Deployment). Historical reference. |

## Domain & data model

| Document | What it is |
|---|---|
| [`domain/DOMAIN_RULES.md`](domain/DOMAIN_RULES.md) | Business rules and the entity model (users, pillars, habits, completions, goals, projects, daily logs) — read this before working on the data layer. |
| [`domain/FREQUENCIES.md`](domain/FREQUENCIES.md) | Habit frequency model and how expected/completed/rate are defined per frequency — read this before touching habit statistics or streaks. |

## Feature references

| Document | What it is |
|---|---|
| [`features/GAMIFICATION.md`](features/GAMIFICATION.md) | The optional XP/level/rank system: the transparent formula, level curve and ranks. |

## Operations & deployment

| Document | What it is |
|---|---|
| [`ops/OPS.md`](ops/OPS.md) | Production hardening: logging, health checks, graceful shutdown, rate limits, security controls, backups, connection pooling. |
| [`ops/DEPLOYMENT.md`](ops/DEPLOYMENT.md) | How LifeOS is deployed: Vercel (web) → Render (API) → Neon (Postgres), env vars, CI/CD, rollback. |

## Security

| Document | What it is |
|---|---|
| [`SECURITY.md`](SECURITY.md) | The security audit and data-isolation checklist (auth, session expiry, IDOR, CSRF, XSS, SQLi, CORS, rate limits, secrets, error handling). |
| [`roadmap/IMPROVE_ROADMAP.md`](roadmap/IMPROVE_ROADMAP.md) | The "Improve" hardening roadmap (security, error contract, coverage, architecture, API/db review, CI/CD, frontend, polish). |

## API

| Document | What it is |
|---|---|
| [`api/ERROR_CONTRACT.md`](api/ERROR_CONTRACT.md) | The standardized error shape `{ error: { code, message } }`, status mapping and the full code list. |
| [`api/OPENAPI.md`](api/OPENAPI.md) | The OpenAPI contract and how to browse it in Swagger UI (`GET /docs` on the API host). |
| [`DATABASE_REVIEW.md`](DATABASE_REVIEW.md) | Database review: indexes, constraints, cascades, nullables, transactions, N+1 and pagination decisions. |

## Quality assurance

| Document | What it is |
|---|---|
| [`qa/TESTING.md`](qa/TESTING.md) | Coverage tooling + thresholds, the test pyramid (unit/domain, contract, E2E, failure scenarios, frontend) and how to run. |

## Architecture & code quality

| Document | What it is |
|---|---|
| [`architecture/008-diagrams.md`](architecture/008-diagrams.md) | The full architecture diagram and data-model ERD. |
| [`architecture/001-monorepo.md`](architecture/001-monorepo.md) | ADR: pnpm monorepo. |
| [`architecture/002-api-architecture.md`](architecture/002-api-architecture.md) | ADR: Fastify feature modules. |
| [`architecture/003-authentication.md`](architecture/003-authentication.md) | ADR: JWT in an HTTP-only cookie. |
| [`architecture/004-shared-validation.md`](architecture/004-shared-validation.md) | ADR: shared Zod validation. |
| [`architecture/005-database.md`](architecture/005-database.md) | ADR: PostgreSQL + Prisma. |
| [`architecture/006-deployment.md`](architecture/006-deployment.md) | ADR: Vercel + Render + Neon. |
| [`architecture/007-layering.md`](architecture/007-layering.md) | The HTTP → Validation → Service → Domain → Persistence boundaries, module convention, and the Phase 6 `any`/`as`/`!` sweep results. |

## Repository conventions

- **Monorepo** with pnpm workspaces: `apps/api` (Fastify), `apps/web` (React + Vite), `packages/shared` (Zod schemas + types shared by both).
- API modules follow `routes` / `service` / `schemas` / `test` per feature under `apps/api/src/modules/`.
- Every endpoint is validated with Zod through a shared `validateInput` helper; every query is scoped by `userId`.
- Tests: API (`apps/api`, Vitest, needs PostgreSQL) and Web integration (`apps/web`, Vitest + Testing Library + MSW).
- CI runs lint → test → build on every PR and push to `main` (`.github/workflows/ci.yml`).

---

_See also: [LifeOS README](../README.md) · [CHANGELOG](../CHANGELOG.md)_
