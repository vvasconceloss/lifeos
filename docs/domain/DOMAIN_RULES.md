# LifeOS — Domain Rules

> Reference document for the core business rules and entity model of the LifeOS MVP.
> Approved during Phase 1 (Contracts and Core Rules) before product code was written.

---

## Entity Diagram

```
User (1) ──── (N) Pillar (1) ──── (N) Habit (1) ──── (N) HabitCompletion
```

- A **User** owns many **Pillars**.
- A **Pillar** belongs to exactly one **User** and contains many **Habits**.
- A **Habit** belongs to exactly one **User** and one **Pillar**, and has many **Completions**.
- A **HabitCompletion** belongs to exactly one **Habit**.

---

## User

| Field        | Type     | Constraints                        |
|-------------|----------|-------------------------------------|
| id          | String   | UUID, primary key                   |
| email       | String   | Unique, 5–254 characters, valid format |
| passwordHash| String   | Never exposed; bcrypt hash (72 bytes max) |
| name        | String?  | Optional display name               |
| createdAt   | DateTime | Auto-generated                      |
| updatedAt   | DateTime | Auto-updated                        |

### Rules

1. **Email uniqueness** — No two users can share the same email. Enforced at the database level (`@unique`).
2. **Password storage** — Password is never stored in plaintext. Must be hashed using bcrypt (or equivalent) before persistence. Only the hash is stored.
3. **Name is optional** — A user can register without providing a display name.
4. **Self-data only** — A user can only access their own resources (pillars, habits, completions). All queries MUST filter by `userId` derived from the authenticated session.
5. **Email format** — Must conform to a valid email structure (regex validated at the API layer via Zod).

---

## Pillar

| Field     | Type     | Constraints                          |
|-----------|----------|--------------------------------------|
| id        | String   | UUID, primary key                    |
| name      | String   | 1–100 characters, required           |
| color     | String?  | Optional, hex color (`#rrggbb`)      |
| userId    | String   | Foreign key to User, required        |
| createdAt | DateTime | Auto-generated                       |
| updatedAt | DateTime | Auto-updated                         |

### Rules

1. **User ownership** — A pillar always belongs to exactly one user. The `userId` is set at creation and is immutable.
2. **User isolation** — A user can only see, edit, or delete their own pillars. All queries must include `userId` in the filter.
3. **Block deletion with habits** — A pillar cannot be deleted while it still has habits (active or archived). The user must archive or delete the habits first. This prevents accidental data loss and forces explicit intent.
4. **Name** — Required and must be between 1 and 100 characters.
5. **Pillar deletion scope** — Deleting a pillar is only allowed when it has no associated habits.
6. **Color** — Optional hex color (`#rrggbb`) used for visual identification in the UI.

---

## Habit

| Field       | Type      | Constraints                          |
|-------------|-----------|--------------------------------------|
| id          | String    | UUID, primary key                    |
| name        | String    | 1–200 characters, required           |
| description | String?   | Optional, max 1000 characters        |
| userId      | String    | Foreign key to User, required        |
| pillarId    | String    | Foreign key to Pillar, required      |
| frequency   | String    | Always `"DAILY"` in the MVP          |
| monthlyGoal | Int?      | Optional monthly completion target (1–93) |
| isActive    | Boolean   | Default `true`                       |
| archivedAt  | DateTime? | `null` when active, set on archive   |
| createdAt   | DateTime  | Auto-generated                       |
| updatedAt   | DateTime  | Auto-updated                         |

### Rules

1. **User ownership** — A habit belongs to exactly one user via `userId`.
2. **Pillar association** — A habit always belongs to exactly one pillar. Required at creation.
3. **User isolation** — All queries must be scoped to the authenticated user.
4. **Frequency** — In the MVP, all habits are daily (`frequency: "DAILY"`). No support for weekly or custom schedules.
5. **Archive** — Habits are archived instead of deleted in normal use:
   - Archiving sets `isActive = false` and `archivedAt = now()`.
   - Archived habits do not appear in the active list (dashboard default view).
   - Archived habits are shown in the Habits settings page under the "Show archived" toggle.
   - Archived habits retain their completion history.
6. **Hard delete** — The API also exposes `DELETE /habits/:id`, which permanently removes the habit and all its completions (cascade). This is an explicit destructive action.
7. **Name** — Required, 1–200 characters.
8. **Description** — Optional, free text, max 1000 characters.
9. **Monthly goal** — Optional integer (1–93). When set, it is the expected number of completions per month and overrides the default (days in month) in completion-rate calculations.
10. **Pillar integrity** — The foreign key from `Habit.pillarId` to `Pillar` is `Restrict`: a pillar cannot be deleted while it still has habits (see Pillar rule 3).
11. **Completions** — Archived habits retain their completion history.

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

## Validation Summary

| Entity           | Field        | Rule                                      |
|------------------|-------------|-------------------------------------------|
| User             | email        | 5–254 chars, valid email format           |
| User             | password     | 8–72 chars (bcrypt limit)                 |
| User             | name         | Optional; if provided, 1–100 chars        |
| Pillar           | name         | 1–100 chars, required                     |
| Pillar           | color        | Optional; valid hex color (`#rrggbb`)     |
| Habit            | name         | 1–200 chars, required                     |
| Habit            | description  | Optional; if provided, max 1000 chars     |
| Habit            | monthlyGoal  | Optional; integer 1–93                    |
| Habit            | pillarId     | Must reference an existing pillar owned by the user |
| HabitCompletion  | date         | Must not be in the future                 |
| HabitCompletion  | habitId+date | Must be unique (no duplicate completions) |

---

## Security Rules

1. **User isolation** — Every query that reads or writes a resource (pillar, habit, completion) MUST include a `userId` filter matching the authenticated user. This is a **non-negotiable security rule**, not an implementation detail.
2. **Password exposure** — The `passwordHash` field must never be returned in any API response.
3. **Authentication required** — All endpoints except `/health`, `/auth/register`, and `/auth/login` require a valid JWT session.
4. **Input validation** — All user-supplied input is validated server-side with Zod before processing.

---

## Mental Test Cases

These scenarios were validated during Phase 1 to confirm the rules are consistent:

1. **Duplicate completion** — Marking the same habit twice on the same day results in no change (idempotent). The second `PUT` is a no-op.
2. **Future completion** — Trying to mark a habit for tomorrow is rejected (400 Bad Request).
3. **Archive visibility** — An archived habit disappears from the dashboard and tracker. Its completion history is preserved.
4. **Blocked delete** — Deleting a pillar with 5 habits is rejected with an error. The user must resolve the habits first.
5. **User isolation** — User A creates a habit. User B cannot see, modify, or complete it, even if User B knows the habit's ID.
6. **Optional description** — Creating a habit with only a name succeeds. The `description` field is `null` in the database.
7. **Unmark past completion** — A completion from 30 days ago can be unmarked without restriction.
8. **Email uniqueness** — Registering with an existing email returns an error. Only the first registration succeeds.

---

_More docs: [Documentation index](../README.md) · [Habit frequencies](../domain/FREQUENCIES.md) · [LifeOS README](../README.md)_
