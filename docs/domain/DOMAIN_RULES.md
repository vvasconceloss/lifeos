# LifeOS — Domain Rules

> Reference document for the core business rules and entity model of LifeOS (v1.5).
> Started during Phase 1 (Contracts and Core Rules) and kept in sync with the schema and APIs
> across phases. The Prisma schema (`apps/api/prisma/schema.prisma`) is the source of truth for the
> data model; this document explains the *rules* on top of it.

---

## Entity Diagram

```
User (1) ──── (N) Pillar (1) ──── (N) Habit (1) ──── (N) HabitCompletion
                    │                    │
                    │                    └─── (N) GoalHabit ──── (N) Goal
                    │
                    ├─── (N) Goal
                    └─── (N) Project (1) ──── (N) ProjectTask

User (1) ──── (N) DailyLog
```

- A **User** owns many **Pillars**, **Goals**, **Projects** and **DailyLogs**.
- A **Pillar** belongs to exactly one **User** and contains many **Habits**.
- A **Habit** belongs to exactly one **User** and one **Pillar**, has many **Completions**, and can
  be linked to many **Goals** through **GoalHabit** (N:N).
- A **Goal** belongs to exactly one **User** and one **Pillar**.
- A **Project** belongs to exactly one **User** and one **Pillar**, and has many **Tasks**.
- A **DailyLog** belongs to exactly one **User** (one per calendar day).

---

## User

| Field        | Type     | Constraints                        |
|-------------|----------|-------------------------------------|
| id          | String   | UUID, primary key                   |
| email       | String   | Unique, 5–254 characters, valid format |
| passwordHash| String   | Never exposed; bcrypt hash (72 bytes max) |
| name        | String?  | Optional display name               |
| timezone    | String?  | Optional IANA timezone              |
| weekStart   | Int      | Default `1` (Monday); 0–6           |
| theme       | String   | Default `"system"`; `light`/`dark`/`system` |
| onboarded   | Boolean  | Default `false`; set `true` after onboarding |
| gamification| Boolean  | Default `false`; opt-in XP/levels   |
| createdAt   | DateTime | Auto-generated                      |
| updatedAt   | DateTime | Auto-updated                        |

### Rules

1. **Email uniqueness** — No two users can share the same email. Enforced at the database level (`@unique`).
2. **Password storage** — Password is never stored in plaintext. Must be hashed using bcrypt before persistence. Only the hash is stored.
3. **Password strength** — Between 8 and 72 characters (bcrypt limit) and must include at least one letter and one number (Zod).
4. **Name is optional** — A user can register without providing a display name.
5. **Self-data only** — A user can only access their own resources. All queries MUST filter by `userId` derived from the authenticated session.
6. **Preferences** — Theme, timezone and week-start are personalization preferences (Phase 8); gamification is an opt-in feature (Phase 9).
7. **Onboarding flag** — `onboarded` is `false` for brand-new accounts and `true` after the onboarding flow; existing accounts were backfilled to `true`.
8. **Email format** — Must conform to a valid email structure (regex validated at the API layer via Zod).

---

## Pillar

| Field       | Type     | Constraints                          |
|-------------|----------|--------------------------------------|
| id          | String   | UUID, primary key                    |
| name        | String   | 1–100 characters, required           |
| color       | String?  | Optional, hex color (`#rrggbb`)      |
| icon        | String?  | Optional, short emoji/text icon      |
| description | String?  | Optional, max 500 characters         |
| sortOrder   | Int      | Default `0`; user-controlled order   |
| userId      | String   | Foreign key to User, required        |
| createdAt   | DateTime | Auto-generated                       |
| updatedAt   | DateTime | Auto-updated                         |

### Rules

1. **User ownership** — A pillar always belongs to exactly one user. The `userId` is set at creation and is immutable.
2. **User isolation** — A user can only see, edit, or delete their own pillars. All queries must include `userId` in the filter.
3. **Block deletion with habits** — A pillar cannot be deleted while it still has habits (active or archived). The user must archive or delete the habits first. Enforced by a `Restrict` FK. This also applies to goals/projects referencing the pillar.
4. **Name** — Required and must be between 1 and 100 characters.
5. **Ordering** — `sortOrder` controls display order (Phase 8), persisted via `POST /pillars/reorder`.
6. **Color / icon / description** — Optional visual metadata used in the UI.

---

## Habit

| Field         | Type          | Constraints                          |
|---------------|---------------|--------------------------------------|
| id            | String        | UUID, primary key                    |
| name          | String        | 1–200 characters, required           |
| description   | String?       | Optional, max 1000 characters        |
| userId        | String        | Foreign key to User, required        |
| pillarId      | String        | Foreign key to Pillar, required      |
| frequency     | HabitFrequency | `DAILY` (default), `WEEKLY_DAYS`, `TIMES_PER_WEEK`, `TIMES_PER_MONTH` |
| daysOfWeek    | Int[]         | Default `[]`; used by `WEEKLY_DAYS` (0=Sun…6=Sat) |
| timesPerWeek  | Int?          | Used by `TIMES_PER_WEEK` (1–7)       |
| timesPerMonth | Int?          | Used by `TIMES_PER_MONTH` (1–31)     |
| icon          | String?       | Optional, short emoji/text icon      |
| color         | String?       | Optional, hex color (`#rrggbb`)      |
| sortOrder     | Int           | Default `0`; user-controlled order   |
| isActive      | Boolean       | Default `true`                       |
| archivedAt    | DateTime?     | `null` when active, set on archive   |
| createdAt     | DateTime      | Auto-generated                       |
| updatedAt     | DateTime      | Auto-updated                         |

### Rules

1. **User ownership** — A habit belongs to exactly one user via `userId`.
2. **Pillar association** — A habit always belongs to exactly one pillar. Required at creation.
3. **User isolation** — All queries must be scoped to the authenticated user.
4. **Frequency** — A habit has one of four frequencies (`HabitFrequency`). The frequency determines expected completions, completion rate and streaks — see [`FREQUENCIES.md`](../domain/FREQUENCIES.md) for the full semantics.
5. **Frequency parameters** — Only the parameters relevant to the selected frequency are used: `daysOfWeek` for `WEEKLY_DAYS`, `timesPerWeek` for `TIMES_PER_WEEK`, `timesPerMonth` for `TIMES_PER_MONTH`. Zod validates the combination.
6. **Archive** — Habits are archived instead of deleted in normal use:
   - Archiving sets `isActive = false` and `archivedAt = now()`.
   - Archived habits do not appear in the active list (dashboard default view).
   - Archived habits are shown in the Habits settings page under the "Show archived" toggle.
   - Archived habits retain their completion history.
7. **Hard delete** — The API also exposes `DELETE /habits/:id`, which permanently removes the habit and all its completions (cascade). This is an explicit destructive action.
8. **Name** — Required, 1–200 characters.
9. **Description** — Optional, free text, max 1000 characters.
10. **Ordering** — `sortOrder` controls display order (Phase 8), persisted via `POST /habits/reorder`.
11. **Pillar integrity** — The foreign key from `Habit.pillarId` to `Pillar` is `Restrict`: a pillar cannot be deleted while it still has habits (see Pillar rule 3).
12. **Goal linking** — A habit can be linked to any number of goals owned by the user, regardless of whether the goal is in the same pillar (documented decision, Phase 5).

---

## HabitCompletion

| Field     | Type     | Constraints                         |
|-----------|----------|--------------------------------------|
| id        | String   | UUID, primary key                    |
| habitId   | String   | Foreign key to Habit, required       |
| date      | DateTime | Date only (time component ignored)   |
| createdAt | DateTime | Auto-generated                       |

### Rules

1. **Habit ownership chain** — A completion belongs to a habit, which belongs to a user. Access control is enforced through the habit chain.
2. **Uniqueness per day** — At most one completion per habit per day. Enforced at the database level with `@@unique([habitId, date])`.
3. **Idempotent creation** — `PUT /habits/:id/completions/:date` ensures the completion exists (no-op if already present).
4. **No future dates** — Completions with a date in the future are rejected. Maximum allowed date is the current date (server time, UTC).
5. **Physical delete on unmark** — `DELETE /habits/:id/completions/:date` permanently removes the completion record. No time restriction applies (past or present can be unmarked).
6. **Cascade on habit archive** — Completions are preserved when a habit is archived.
7. **Cascade on habit deletion** — If the habit is deleted (`DELETE /habits/:id`), all its completions are removed (cascade).
8. **Date-only semantics** — The `date` field is treated as a calendar date. The time component is ignored at the application layer (stored as UTC midnight or date-only).

---

## Goal

| Field       | Type       | Constraints                          |
|-------------|------------|--------------------------------------|
| id          | String     | UUID, primary key                    |
| title       | String     | 1–200 characters, required           |
| description | String?    | Optional, max 2000 characters        |
| userId      | String     | Foreign key to User, required        |
| pillarId    | String     | Foreign key to Pillar, required      |
| status      | GoalStatus | `ACTIVE` (default), `COMPLETED`, `ABANDONED` |
| deadline    | DateTime?  | Optional target date (date only)     |
| completedAt | DateTime?  | Set when status becomes `COMPLETED`  |
| createdAt   | DateTime   | Auto-generated                       |
| updatedAt   | DateTime   | Auto-updated                         |

### Rules

1. **User ownership & isolation** — A goal belongs to exactly one user; all queries are scoped by `userId`.
2. **Pillar association** — A goal must reference an existing pillar owned by the user (`Restrict` FK).
3. **Status transitions** — Transitions are manual via `PATCH`. `completedAt` is set when the goal becomes `COMPLETED` and cleared otherwise. No auto-completion.
4. **Progress is derived** — `progress` is never stored. It is the average completion rate of the linked habits (see Phase 5 notes); zero linked habits → 0.
5. **Habit linking** — `GoalHabit` is an N:N join table (composite PK `goalId + habitId`). Linking is idempotent; a habit must belong to the authenticated user. Removing a link is immediate.

---

## Project

| Field       | Type          | Constraints                          |
|-------------|---------------|--------------------------------------|
| id          | String        | UUID, primary key                    |
| title       | String        | 1–200 characters, required           |
| description | String?       | Optional, max 2000 characters        |
| userId      | String        | Foreign key to User, required        |
| pillarId    | String        | Foreign key to Pillar, required      |
| status      | ProjectStatus | `PLANNING` (default), `IN_PROGRESS`, `COMPLETED`, `PAUSED` |
| deadline    | DateTime?     | Optional target date (date only)     |
| completedAt | DateTime?     | Set when status becomes `COMPLETED`  |
| createdAt   | DateTime      | Auto-generated                       |
| updatedAt   | DateTime      | Auto-updated                         |

### Rules

1. **User ownership & isolation** — A project belongs to exactly one user; all queries are scoped by `userId`.
2. **Pillar association** — A project must reference an existing pillar owned by the user (`Restrict` FK).
3. **Status transitions** — Transitions are manual via `PATCH`; `completedAt` mirrors `COMPLETED` (same semantics as Goals).
4. **Progress is derived** — `progress = round(completedTasks / totalTasks × 100)`; 0 tasks → 0. Never stored.

### ProjectTask

| Field     | Type     | Constraints                          |
|-----------|----------|--------------------------------------|
| id        | String   | UUID, primary key                    |
| projectId | String   | Foreign key to Project (Cascade), required |
| title     | String   | 1–500 characters, required           |
| isDone    | Boolean  | Default `false`                      |
| position  | Int      | Default `0`; order within project    |
| createdAt | DateTime | Auto-generated                       |
| updatedAt | DateTime | Auto-updated                         |

Rules: a task belongs to exactly one project; tasks are ordered by `position` (reorder via `POST /projects/:id/tasks/reorder`); deleting a project cascades to its tasks.

---

## DailyLog

| Field      | Type     | Constraints                          |
|------------|----------|--------------------------------------|
| id         | String   | UUID, primary key                    |
| userId     | String   | Foreign key to User, required        |
| date       | DateTime | Date only; one per user per day (`@@unique([userId, date])`) |
| mood       | Int?     | 1–10                                 |
| energy     | Int?     | 1–10                                 |
| sleepHours | Float?   | 0–24                                 |
| notes      | String?  | Optional, max 5000 characters        |
| createdAt  | DateTime | Auto-generated                       |
| updatedAt  | DateTime | Auto-updated                         |

### Rules

1. **User ownership & isolation** — A daily log belongs to exactly one user.
2. **One per day** — A user can have at most one log per calendar date (unique constraint).
3. **Upsert** — `POST /daily-logs` is an idempotent upsert by date.
4. **No future dates** — Logging a future date is rejected (400).
5. **Correlations are associations** — Any relationship between log fields and completion rate is presented as *association*, never causation.

---

## Validation Summary

| Entity           | Field        | Rule                                      |
|------------------|-------------|-------------------------------------------|
| User             | email        | 5–254 chars, valid email format           |
| User             | password     | 8–72 chars (bcrypt limit), ≥1 letter, ≥1 number |
| User             | name         | Optional; if provided, 1–100 chars        |
| Pillar           | name         | 1–100 chars, required                     |
| Pillar           | color        | Optional; valid hex color (`#rrggbb`)     |
| Habit            | name         | 1–200 chars, required                     |
| Habit            | frequency    | One of `DAILY`, `WEEKLY_DAYS`, `TIMES_PER_WEEK`, `TIMES_PER_MONTH` |
| Habit            | daysOfWeek   | Required (non-empty, unique) for `WEEKLY_DAYS` |
| Habit            | timesPerWeek | Required for `TIMES_PER_WEEK` (1–7)       |
| Habit            | timesPerMonth| Required for `TIMES_PER_MONTH` (1–31)     |
| Habit            | pillarId     | Must reference an existing pillar owned by the user |
| HabitCompletion  | date         | Must not be in the future                 |
| HabitCompletion  | habitId+date | Must be unique (no duplicate completions) |
| Goal             | title        | 1–200 chars, required                     |
| Goal             | status       | `ACTIVE` / `COMPLETED` / `ABANDONED`      |
| Project          | title        | 1–200 chars, required                     |
| Project          | status       | `PLANNING` / `IN_PROGRESS` / `COMPLETED` / `PAUSED` |
| ProjectTask      | title        | 1–500 chars, required                     |
| DailyLog         | mood/energy  | 1–10 when present                         |
| DailyLog         | sleepHours   | 0–24 when present                         |

---

## Security Rules

1. **User isolation** — Every query that reads or writes a resource (pillar, habit, completion, goal, project, task, daily log) MUST include a `userId` filter matching the authenticated user. This is a **non-negotiable security rule**, not an implementation detail.
2. **Password exposure** — The `passwordHash` field must never be returned in any API response.
3. **Authentication required** — All endpoints except `/health`, `/health/ready`, `/auth/register`, `/auth/login` and `/auth/demo` require a valid JWT session.
4. **Input validation** — All user-supplied input is validated server-side with Zod before processing.

---

## Mental Test Cases

These scenarios are validated by the automated test suites and the manual QA (Phases 1, 13, 15):

1. **Duplicate completion** — Marking the same habit twice on the same day results in no change (idempotent).
2. **Future completion** — Trying to mark a habit for tomorrow is rejected (400).
3. **Archive visibility** — An archived habit disappears from the dashboard and tracker. Its completion history is preserved.
4. **Blocked delete** — Deleting a pillar with habits is rejected; the user must resolve the habits first.
5. **User isolation** — User A creates a habit/goal/project/log. User B cannot see, modify, or complete it, even if User B knows the resource ID.
6. **Optional description** — Creating a habit with only a name succeeds.
7. **Unmark past completion** — A completion from 30 days ago can be unmarked without restriction.
8. **Email uniqueness** — Registering with an existing email returns an error.
9. **Frequency expected counts** — `expectedForMonth` differs per frequency and drives rate/goal calculations (§5, §5.1 of FREQUENCIES.md).
10. **Goal progress from habits** — Linking a habit with history immediately reflects its completion rate in the goal's progress.
11. **Demo isolation** — The public demo session never blocks real login/register; visiting those pages exits the demo.
12. **Daily log upsert** — Saving the same day twice updates the existing log instead of creating a duplicate.

---

_More docs: [Documentation index](../README.md) · [Habit frequencies](../domain/FREQUENCIES.md) · [LifeOS README](../README.md)_
