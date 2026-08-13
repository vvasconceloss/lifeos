# ADR 005 — Database (PostgreSQL + Prisma)

- **Status:** Accepted
- **Date:** 2026

## Context

The product is relational: users own pillars, habits, goals, projects, tasks, completions and
daily logs, with tight relationships (a habit belongs to a pillar; a goal links to habits; a
project has tasks). Data isolation between users is a hard requirement.

## Problem

Choose a database + ORM that models these relationships, guarantees referential integrity, and
makes data isolation hard to break by accident.

## Decision

Use **PostgreSQL** with **Prisma**:

- All `@relation` FKs are explicit; ownership (User → child) uses `onDelete: Cascade`, and
  Pillar → Habit/Goal/Project uses `Restrict` so a pillar with children cannot be deleted.
- Business uniqueness is enforced at the DB level: `User.email` unique, `DailyLog @@unique([userId, date])`,
  `HabitCompletion @@unique([habitId, date])`, `GoalHabit @@id([goalId, habitId])`.
- Frequent queries are indexed: `@@index([userId])` on each owned entity,
  `@@index([pillarId])`, `@@index([projectId])`.
- Migrations are additive SQL files applied explicitly in the deploy pipeline
  (`prisma migrate deploy`), never automatically at boot.
- The client uses `@prisma/adapter-pg` (a `pg` pool) — connection pooling is delegated to `pg`.

## Alternatives considered

- **MongoDB / document DB** — rejected: the relational shape (joins between habits/goals/
  projects) fits PostgreSQL; document storage would complicate aggregations and isolation.
- **Raw SQL / query builder** — rejected: Prisma gives typed queries + migrations for free.
- **TypeORM** — rejected: Prisma's schema-first model and migration tooling fit better.

## Trade-offs

- Prisma is an extra abstraction layer (runtime + generated client); schema changes require
  migration + `prisma generate`.
- Complex aggregations (stats/analytics) are still written by hand on top of Prisma (bounded,
  indexed queries — Phase 5 review).

## Consequences

- Data isolation is enforced by `userId` in every service query (Phase 1), backed by indexes.
- Index/constraint/cascade review is documented (`docs/DATABASE_REVIEW.md`).
