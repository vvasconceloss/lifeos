# LifeOS — Documentation

This is the entry point for LifeOS documentation. Start here to find what you need.

## Quick links

- **[LifeOS README](../README.md)** — product overview, features, setup, deploy.
- **[CHANGELOG](../CHANGELOG.md)** — v1.0 → v1.5 release history.

## Roadmap & plans

| Document | What it is |
|---|---|
| [`1.5_PLAN.md`](1.5_PLAN.md) | The v1.5 roadmap: objectives, specs and checklists for every phase (audit, UX, frequencies, analytics, goals, projects, journal, personalization, onboarding, gamification, observability, testing, CI/CD, release). |
| [`MVP_PLAN.md`](MVP_PLAN.md) | The original v1.0 MVP plan (Foundation → Deployment). Historical reference. |

## Domain & data model

| Document | What it is |
|---|---|
| [`DOMAIN_RULES.md`](DOMAIN_RULES.md) | Business rules and the entity model (users, pillars, habits, completions, goals, projects, daily logs) — read this before working on the data layer. |
| [`FREQUENCIES.md`](FREQUENCIES.md) | Habit frequency model and how expected/completed/rate are defined per frequency — read this before touching habit statistics or streaks. |

## Feature references

| Document | What it is |
|---|---|
| [`GAMIFICATION.md`](GAMIFICATION.md) | The optional XP/level/rank system: the transparent formula, level curve and ranks. |

## Operations & deployment

| Document | What it is |
|---|---|
| [`OPS.md`](OPS.md) | Production hardening: logging, health checks, graceful shutdown, rate limits, security controls, backups, connection pooling. |
| [`DEPLOYMENT.md`](DEPLOYMENT.md) | How LifeOS is deployed: Vercel (web) → Render (API) → Neon (Postgres), env vars, CI/CD, rollback. |

## Repository conventions

- **Monorepo** with pnpm workspaces: `apps/api` (Fastify), `apps/web` (React + Vite), `packages/shared` (Zod schemas + types shared by both).
- API modules follow `routes` / `service` / `schemas` / `test` per feature under `apps/api/src/modules/`.
- Every endpoint is validated with Zod through a shared `validateInput` helper; every query is scoped by `userId`.
- Tests: API (`apps/api`, Vitest, needs PostgreSQL) and Web integration (`apps/web`, Vitest + Testing Library + MSW).
- CI runs lint → test → build on every PR and push to `main` (`.github/workflows/ci.yml`).

---

_See also: [LifeOS README](../README.md) · [CHANGELOG](../CHANGELOG.md)_
