# LifeOS — Habit Frequencies & Rich History

> Formal reference document for the habit frequency model (Phase 3 of [`v1.5_PUBLIC_BETA.md`](../roadmap/v1.5_PUBLIC_BETA.md)).
> Approved before any database schema change. This document defines the semantics of
> **expected completions**, **actual completions**, **completion rate**, and **streaks**
> for every supported frequency type, and describes the data model, migration, API and
> frontend changes that implement it.

---

## Table of Contents

- [1. Scope](#1-scope)
- [2. Frequency types](#2-frequency-types)
- [3. Expected completions](#3-expected-completions)
- [4. Actual completions](#4-actual-completions)
- [5. Completion rate](#5-completion-rate)
- [6. Streaks](#6-streaks)
- [7. Period comparison](#7-period-comparison)
- [8. Data model](#8-data-model)
- [9. Migration](#9-migration)
- [10. API surface](#10-api-surface)
- [11. Frontend](#11-frontend)
- [12. Tests](#12-tests)
- [13. Open questions & deferred](#13-open-questions--deferred)

---

## 1. Scope

The MVP supported a single frequency (`DAILY`) plus an optional `monthlyGoal`. Phase 3
generalizes the habit core to four realistic frequency types and adds a per-habit
history surface (individual monthly calendar, streaks, rates, and period comparison).

The four frequency types:

```
DAILY            → every day
WEEKLY_DAYS      → specific days of the week (e.g., Mon/Wed/Fri)
TIMES_PER_WEEK   → X times per week, any days
TIMES_PER_MONTH  → X times per month, any days
```

---

## 2. Frequency types

| Frequency        | Parameter(s)              | Validation                                   |
|------------------|---------------------------|----------------------------------------------|
| `DAILY`          | —                         | —                                            |
| `WEEKLY_DAYS`    | `daysOfWeek: Int[]`       | Non-empty; values 0–6 (`0=Sun … 6=Sat`); unique |
| `TIMES_PER_WEEK` | `timesPerWeek: Int`       | 1–7                                          |
| `TIMES_PER_MONTH`| `timesPerMonth: Int`      | 1–31                                         |

Rules:

1. A habit must declare exactly the parameters of its own frequency; parameters for
   other frequencies are ignored/rejected at the API layer.
2. `WEEKLY_DAYS` requires at least one day. There is no "zero days" habit.
3. Weekday indices follow `Date.prototype.getUTCDay()`: `0 = Sunday … 6 = Saturday`.

---

## 3. Expected completions

Let `P` be a **day window** — the ordered set of calendar days being measured
(for example: a calendar month, or the trailing 30 days).

Expected completions for a habit with frequency `f` over window `P`:

| Frequency        | `expected(P)`                                                             |
|------------------|---------------------------------------------------------------------------|
| `DAILY`          | `\|P\|`                                                                   |
| `WEEKLY_DAYS` D  | `\|{ d ∈ P : weekday(d) ∈ D }\|`                                          |
| `TIMES_PER_WEEK` T | `round(T × \|P\| / 7)`                                                  |
| `TIMES_PER_MONTH` M | full calendar month → `M`; arbitrary window → `round(M × \|P\| / 30)`   |

Notes:

- `WEEKLY_DAYS` counts only the scheduled weekdays that actually fall inside `P`,
  which naturally handles months of different lengths and month-boundary windows.
- `TIMES_PER_WEEK` and `TIMES_PER_MONTH` are "soft" targets: no specific day is
  required, only a volume per period.
- `round` uses standard half-up rounding (`Math.round`).
- A window of length zero yields `expected = 0` and the rate is defined as `0`.

---

## 4. Actual completions

Actual completions for window `P` is the number of distinct completed days within `P`
(counted per `HabitCompletion`, which is unique per `(habitId, date)`).

Additional rules:

1. **Non-scheduled completions are allowed.** A user may complete a habit on a day
   that is not scheduled by its frequency (e.g., a `WEEKLY_DAYS` habit completed on a
   rest day). These completions count toward `actual`, but the completion rate is
   capped at 100 (see §5).
2. A day is either completed or not; there is no partial credit within a day.

---

## 5. Completion rate

```text
completionRate(P) = min(100, round(100 × actual(P) / expected(P)))
```

- If `expected(P) == 0` the rate is `0`.
- The rate is capped at 100 because exceeding a soft/volume target is not considered
  "more than perfect".

### 5.1 Elapsed-aware rates (current period)

Rates describe **actual performance so far**. For the **current, in-progress period**
(month or week) the denominator only counts the days that have actually elapsed — up to
today — never the future days of that period:

- `GET /stats/overview`, `GET /stats/monthly` and the dashboard success rate divide
  `actual` by the expected completions over `[period start → today]` when the queried
  period is the current month; past months use the whole month.
- `GET /stats/analytics` does the same for the current **week** (already) and for the
  current **month** in `monthlyRates`.
- Per-habit **goal** numbers (dashboard grid and mobile "X/goal") deliberately keep the
  **full month** as the target — they answer "progress toward this month's goal", while
  rates answer "how well am I doing so far". So on day 9 of a fully-on-track daily
  habit you see `9/31` (goal) together with a `100%` rate (performance so far).
- The dashboard **monthly progress** uses the same `completionRate` (capped at 100) as the
  Statistics page, so exceeding a volume target never shows above 100% anywhere.

This keeps the metrics consistent with real usage: a mid-month completion rate is never
diluted by days that have not happened yet.

---

## 6. Streaks

Streaks are always computed with respect to the habit's own frequency.

### Reference day and forgiving semantics

- The **current streak** ends at the latest "relevant unit" that is not in the future:
  for daily/days-based frequencies that is **today** (UTC); for weekly/monthly
  frequencies it is the **current week / current month**.
- **Forgiving rule:** an in-progress unit (today, this week, this month) that has not
  been completed yet does **not** break the streak — the streak counts back from the
  last fully completed unit. This matches the existing MVP behavior for `DAILY`.

### Per frequency

| Frequency        | Current streak (SC) and best streak (SB)                                   |
|------------------|----------------------------------------------------------------------------|
| `DAILY`          | SC = consecutive completed days ending today (or yesterday if today pending). SB = longest run of consecutive completed days. |
| `WEEKLY_DAYS`    | SC = consecutive **scheduled** days ending at the most recent scheduled day ≤ today; non-scheduled days are skipped, never break the streak. SB = longest run of consecutive scheduled days. |
| `TIMES_PER_WEEK` | SC = consecutive **weeks** (Mon–Sun) with ≥ `T` completions, ending at the current week; the current week counts only once its target is met, otherwise the streak counts back from the last met week. SB = longest run of consecutive weeks meeting the target. |
| `TIMES_PER_MONTH`| SC = consecutive **months** with ≥ `M` completions, ending at the current month; the current month counts only once its target is met. SB = longest run of consecutive months meeting the target. |

### Week and month boundaries

- Weeks run **Monday to Sunday** (`0=Mon … 6=Sun` internally) for all weekly
  calculations. A user-configurable week start is a **Phase 8** concern.
- Months are calendar months in UTC.

---

## 7. Period comparison

For an arbitrary window `W`, the comparison compares the current period against the
**immediately preceding window of equal length** `W′`:

```text
current  = completionRate(W)
previous = completionRate(W′)
delta    = current − previous
```

- Example: `W = last 30 days`, `W′ = the 30 days before that`.
- Delivered per habit alongside the window aggregates.

---

## 8. Data model

```prisma
enum HabitFrequency {
  DAILY
  WEEKLY_DAYS
  TIMES_PER_WEEK
  TIMES_PER_MONTH
}

model Habit {
  id            String         @id @default(uuid())
  name          String
  description   String?
  userId        String
  pillarId      String
  frequency     HabitFrequency @default(DAILY)
  daysOfWeek    Int[] @default([])  // WEEKLY_DAYS: 0=Sun..6=Sat
  timesPerWeek  Int?           // TIMES_PER_WEEK: 1..7
  timesPerMonth Int?           // TIMES_PER_MONTH: 1..31
  isActive      Boolean        @default(true)
  createdAt     DateTime       @default(now())
  updatedAt     DateTime       @updatedAt
  archivedAt    DateTime?

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  pillar      Pillar            @relation(fields: [pillarId], references: [id], onDelete: Restrict)
  completions HabitCompletion[]

  @@index([userId])
  @@index([pillarId])
}
```

- `daysOfWeek` maps to a PostgreSQL `integer[]` column.
- The existing `monthlyGoal` column is **removed** (see migration below).
- The existing scalar `frequency String @default("DAILY")` becomes the enum column.

---

## 9. Migration

1. `CREATE TYPE "HabitFrequency" AS ENUM ('DAILY', 'WEEKLY_DAYS', 'TIMES_PER_WEEK', 'TIMES_PER_MONTH')`.
2. `ALTER TABLE "Habit" ALTER COLUMN "frequency" DROP DEFAULT`, then cast
   `frequency::text::"HabitFrequency"` (all existing values are `'DAILY'`), then
   re-apply `SET DEFAULT 'DAILY'`.
3. Data backfill:
   - `UPDATE "Habit" SET "frequency" = 'TIMES_PER_MONTH', "timesPerMonth" = "monthlyGoal" WHERE "monthlyGoal" IS NOT NULL;`
   - All other habits remain `DAILY`.
4. `ALTER TABLE "Habit" DROP COLUMN "monthlyGoal"`.
5. Re-generate the Prisma client.

No data loss: every existing habit maps deterministically to `DAILY` or
`TIMES_PER_MONTH`, preserving its completion history and meaning of its previous
`monthlyGoal`.

---

## 10. API surface

### Habit create/update

`POST /habits` and `PATCH /habits/:id` accept:

```jsonc
// DAILY
{ "name": "Program", "pillarId": "…" }

// WEEKLY_DAYS
{ "name": "Read", "pillarId": "…", "frequency": "WEEKLY_DAYS", "daysOfWeek": [1, 3, 5] }

// TIMES_PER_WEEK
{ "name": "Train", "pillarId": "…", "frequency": "TIMES_PER_WEEK", "timesPerWeek": 4 }

// TIMES_PER_MONTH
{ "name": "Meditate", "pillarId": "…", "frequency": "TIMES_PER_MONTH", "timesPerMonth": 12 }
```

- Zod validates the parameter/type combination (see §2). Unknown extra parameters are
  stripped; invalid combinations are rejected with `400`.
- The `HabitResponse` includes the resolved `frequency` + its parameters.
- `monthlyGoal` is no longer accepted.

### Habit history

`GET /habits/:id/history?from=YYYY-MM-DD&to=YYYY-MM-DD`

```jsonc
{
  "history": {
    "habitId": "…",
    "from": "2026-06-01",
    "to": "2026-06-30",
    "days": [
      { "date": "2026-06-01", "weekday": 1, "scheduled": true, "completed": true }
      // …one entry per day in the window
    ],
    "expected": 21,
    "actual": 19,
    "completionRate": 90,
    "currentStreak": 5,
    "bestStreak": 12,
    "comparison": { "current": 90, "previous": 71, "delta": 19 }
  }
}
```

- `scheduled` reflects whether the day is required by the habit's frequency.
- Scope: authenticated user only (`userId` filter).

### Statistics

- `GET /stats/habits/:id?year&month` and `GET /stats/overview` switch their
  completion-rate and streak calculations from `monthlyGoal` to the frequency-based
  logic in §3–§6. Response shape is unchanged (fields are already present).

---

## 11. Frontend

- **Habit form** (creation modal + edit card): a frequency `<select>` with conditional
  controls — day-of-week checkboxes for `WEEKLY_DAYS`, a number input (1–7) for
  `TIMES_PER_WEEK`, a number input (1–31) for `TIMES_PER_MONTH`. The previous
  "monthly goal" input is replaced by this selector (mapping to `TIMES_PER_MONTH`).
- **Habit detail page** (`/habits/:id`), new route under the app layout:
  - Individual **monthly calendar** (completed / scheduled-but-missed / not-scheduled).
  - Current streak, best streak, completion rate.
  - **Period comparison** (last 30 days vs. the previous 30 days).
- **Dashboard/insights:** the monthly "goal" in the grid is computed from the habit's
  frequency expected-completions for the displayed month (§3), instead of `monthlyGoal`.

---

## 12. Tests

### Unit tests (pure functions in `stats.utils.ts` / a new `frequency.ts`)

- `expected(P)` for each frequency: full month, short month, month-boundary window,
  empty window.
- `completionRate`: cap at 100, zero-expected → 0, non-scheduled completions.
- Streaks per frequency, including:
  - `WEEKLY_DAYS`: gaps on non-scheduled days do not break the streak.
  - `TIMES_PER_WEEK`: week boundaries, in-progress current week (forgiving), missed week
    breaks the streak, best streak across months.
  - `TIMES_PER_MONTH`: month boundaries, in-progress current month, missed month.
  - No history → 0.
- Period comparison: equal-length previous window, delta sign.

### Contract tests

- Create/update habits with each frequency and its params; reject invalid combinations.
- `GET /habits/:id/history` returns the day map + aggregates + comparison, scoped to
  the authenticated user.
- `GET /stats/habits/:id` respects frequency for rate/streaks.
- Existing suite must remain green (the rest of the API suite).

---

## 13. Open questions & deferred

- **Week start day** configuration is deferred to Phase 8 (Personalization); Phase 3
  uses Monday–Sunday.
- **Non-scheduled completions** are allowed and rate-capped at 100. If product feedback
  later prefers stricter enforcement, this becomes a settings toggle.
- Streaks for `TIMES_PER_WEEK`/`TIMES_PER_MONTH` are week/month-based (approved);
  generic "any-day" streaks are intentionally not used.
- No changes to the completion endpoints (`PUT/DELETE …/completions/:date`); marking
  remains day-based and idempotent.

---

_More docs: [Documentation index](../README.md) · [Domain rules](../domain/DOMAIN_RULES.md) · [LifeOS README](../README.md)_
