# LifeOS — Database Review

> (see [`roadmap/v1.5.1_IMPROVE.md`](roadmap/v1.5.1_IMPROVE.md)).
> Source of truth: `apps/api/prisma/schema.prisma`.

## Indexes

Every frequent query pattern is covered:

| Query pattern | Index |
|---|---|
| `WHERE email = ?` (login/register) | `User.email` unique |
| `WHERE userId = ?` (pillars, habits, goals, projects) | `@@index([userId])` on each |
| `WHERE pillarId = ?` (habit/goal/project lookups) | `@@index([pillarId])` on each |
| `WHERE habitId = ? AND date = ?` (mark/unmark completion) | `@@unique([habitId, date])` |
| `WHERE habitId IN (…) AND date BETWEEN …` (stats/analytics) | same `@@unique([habitId, date])` |
| `WHERE userId = ? AND date = ?` / date range (daily logs) | `@@unique([userId, date])` |
| `WHERE goalId = ?` (goal habits) | `GoalHabit` composite PK `(goalId, habitId)` |
| `WHERE projectId = ?` (tasks) | `@@index([projectId])` |

**Conclusion: no missing indexes.** The two "special attention" queries (`userId`, `habitId + date`) are indexed.

## Unique constraints

| Rule | Constraint |
|---|---|
| One account per email | `User.email` unique |
| One daily log per user per day | `@@unique([userId, date])` on `DailyLog` |
| One completion per habit per day (idempotent) | `@@unique([habitId, date])` on `HabitCompletion` |
| One goal↔habit link | `@@id([goalId, habitId])` on `GoalHabit` |

All business uniqueness rules are enforced at the database level.

## Cascade behavior

| Parent → Child | onDelete | Rationale |
|---|---|---|
| User → Pillar / Habit / Goal / Project / DailyLog | **Cascade** | Deleting an account removes all of its data (privacy) |
| Pillar → Habit / Goal / Project | **Restrict** | A pillar with children cannot be deleted — avoids orphaned data; children must be removed first |
| Habit → HabitCompletion / GoalHabit | Cascade | Deleting a habit removes its history and links |
| Goal → GoalHabit | Cascade | Links only exist within a goal |
| Project → ProjectTask | Cascade | Tasks only exist within a project |

Consistent: ownership cascades, referential integrity of pillars is protected.

## Nullable fields

Every nullable column is intentional:

- `User.name`, `timezone` — optional profile.
- `Pillar`/`Habit` `color`, `icon`, `description` — optional personalization.
- `Habit.timesPerWeek` / `timesPerMonth` — set only for their frequency type.
- `Habit.archivedAt`, `Goal.completedAt`, `Goal/Project.deadline` — optional temporal state.
- `DailyLog.mood/energy/sleepHours/notes` — an entry can be partial.

## Transaction boundaries

- **Onboarding** — pillars + habits + `user.onboarded` in one `$transaction` (atomic).
- **Reordering** (pillars, project tasks) — all position updates in one `$transaction`.
- **Demo reseed** — data wipe + recreate in one `$transaction`.
- Completions are single-table idempotent upserts; daily-log upserts are atomic by unique key.
- Multi-entity client flows (e.g., create goal → link habit) are separate calls — acceptable, since each call is internally atomic and the client reflects state.

## Query efficiency / N+1

- **Statistics/analytics**: Map-based aggregation with 2–3 indexed queries (habits + completions + pillar stats) — no N+1.
- **Goals list**: one batch `GoalHabit` query + one batch completions query, aggregated in memory.
- **Projects list**: two `groupBy` queries (total/done tasks).
- No N+1 patterns found.

## Pagination decision

**Deliberately not paginated.** `GET /habits`, `/goals`, `/projects`, `/daily-logs`, `/pillars` return
a single user's lists, which are small and bounded (a person tracks dozens, not thousands).
Ordering is deterministic (`sortOrder`, then `createdAt`). The tables that do grow
(`HabitCompletion`, `DailyLog`) are always queried with a bounded date range
(month/week window), so their size doesn't affect list responses.

Pagination would add complexity without a real user-facing need — per the roadmap rule, it is
**not added artificially**.

## Migration safety

Migrations are additive and reversible by design (new columns with defaults, new tables, new enum
types). The one data migration (Phase 3 `monthlyGoal` → `TIMES_PER_MONTH`) backfilled existing rows
with no data loss. No destructive migrations ship in the deploy pipeline (`prisma migrate deploy`
only applies pending migrations).

---

_More docs: [Documentation index](README.md) · [Domain rules](domain/DOMAIN_RULES.md) · [LifeOS README](../README.md)_
