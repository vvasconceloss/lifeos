# LifeOS — Architecture Diagram & Data Model (ERD)

> Result of **Phase 4 — Architecture Documentation**
> (see [`docs/roadmap/IMPROVE_ROADMAP.md`](../roadmap/IMPROVE_ROADMAP.md)).

## Architecture diagram

```text
                         ┌─────────────────────────────────────┐
                         │              Browser                 │
                         │      React SPA (Vite + router)       │
                         └──────────────────┬───────────────────┘
                                            │ HTTPS — same origin
                                            ▼
                         ┌─────────────────────────────────────┐
                         │                Vercel                │  hosting (web)
                         │   static build · rewrites /v1/*      │
                         └──────────────────┬───────────────────┘
                                            │ /v1/*   (docs kept on the API host)
                                            ▼
                         ┌─────────────────────────────────────┐
                         │                Render                │  hosting (API)
                         │        Fastify API (Node)            │
                         │  plugins: auth · csrf · helmet ·     │
                         │  rate-limit · error-handler · openapi│
                         │  modules: auth, pillars, habits,     │
                         │  completions, goals, projects,        │
                         │  daily-logs, stats, progression       │
                         │  /docs  → Swagger UI                  │
                         └──────────────────┬───────────────────┘
                                            │
                         ┌──────────────────▼───────────────────┐
                         │                Prisma                 │
                         │   typed queries · pg pool ·           │
                         │   migrations (`migrate deploy`)       │
                         └──────────────────┬───────────────────┘
                                            ▼
                         ┌─────────────────────────────────────┐
                         │            Neon Postgres             │  database
                         │        (managed, backups)            │
                         └─────────────────────────────────────┘

   Cross-cutting:
   • Authentication  — JWT in an HTTP-only cookie (SameSite=Strict, Secure)  → ADR 003
   • Validation      — shared Zod schemas (packages/shared) at every boundary → ADR 004
   • CI              — GitHub Actions: lint → test (coverage) → build → audit
   • Error contract  — { error: { code, message } } on every endpoint        → ERROR_CONTRACT.md
```

## Data model (ERD)

```text
                       ┌───────────┐
                       │   User    │  id · email (unique) · password_hash · name ·
                       └─────┬─────┘  timezone · week_start · theme · onboarded · gamification
                             │ 1
              ┌──────────────┼──────────────────────────────┐
              │ 0..n         │ 0..n                        │ 0..n
       ┌──────▼───────┐ ┌────▼──────┐              ┌───────▼───────┐
       │   Pillar     │ │   Goal    │              │  DailyLog     │
       │ id·name·color│ │ id·title· │              │ id·date·mood· │
       │ ·icon·desc·  │ │ status·   │              │ energy·sleep· │
       │ sort_order   │ │ deadline  │              │ notes         │
       └──────┬───────┘ └────┬──────┘              │ @@unique(user+date)
              │ 1            │ 1                   └───────────────┘
              │              │
      ┌───────▼───────┐  ┌───▼───────────┐
      │    Habit      │  │ GoalHabit     │  N:N (goal ↔ habit)
      │ id·name·pillar│  │ (goalId,      │
      │ ·frequency·   │  │  habitId) PK  │
      │ days/times    │  └───────────────┘
      │ ·icon·color   │
      │ ·is_active    │
      └───────┬───────┘
              │ 1
      ┌───────▼───────────┐
      │  HabitCompletion  │  id · habit_id · date
      │  @@unique(habit+date)
      └───────────────────┘

                       ┌───────────┐
                       │  Project  │  id · title · status · deadline · pillar_id
                       └─────┬─────┘
                             │ 1
                       ┌─────▼────────────┐
                       │  ProjectTask     │  id · title · is_done · position
                       └──────────────────┘

   Relationships / cardinality:
   User 1 ── n Pillar │ User 1 ── n Goal │ User 1 ── n DailyLog │ User 1 ── n Project
   Pillar 1 ── n Habit (Restrict) │ Pillar 1 ── n Goal (Restrict)
   Goal n ── m Habit (via GoalHabit) │ Habit 1 ── n HabitCompletion
   Project 1 ── n ProjectTask │ Habit 1 ── n GoalHabit
```

## Reference

- ADRs: [`001-monorepo`](001-monorepo.md) · [`002-api-architecture`](002-api-architecture.md) ·
  [`003-authentication`](003-authentication.md) · [`004-shared-validation`](004-shared-validation.md) ·
  [`005-database`](005-database.md) · [`006-deployment`](006-deployment.md) ·
  [`007-layering`](007-layering.md)
- Database details (indexes, cascades, constraints): [`docs/DATABASE_REVIEW.md`](../DATABASE_REVIEW.md)

---

_More docs: [Documentation index](../README.md) · [LifeOS README](../../README.md)_
