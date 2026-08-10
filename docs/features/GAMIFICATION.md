# LifeOS — Gamification / Progression

Reference for the XP/Level/Rank system (Phase 9 of [`ROADMAP.md`](../roadmap/ROADMAP.md)).

## Principle

Gamification must **represent real progress**, never fabricate it. Every XP point is derived from
existing data (habit completions, goal progress, project progress, streaks) using a transparent,
deterministic formula. It is entirely optional.

## Enable / disable

- Stored on the `User` as `gamification` (boolean), **off by default**.
- Toggled from **Profile → Preferences → Gamification** (`PATCH /auth/me { gamification }`).
- When disabled, `GET /v1/progression` returns `{ enabled: false, overall: null, pillars: [] }` and
  nothing is displayed in the UI.

## Per-pillar XP

Each pillar produces a score between **0 and 10,000 XP** from four sources:

| Source | Rate (0–100) | Weight | Max XP |
|---|---|---|---|
| Habit completion | average completion rate of the pillar's active habits over the last **90 days** (frequency-aware) | ×40 | 4,000 |
| Goal progress | average progress (0–100) of the pillar's goals (excluding abandoned) | ×30 | 3,000 |
| Project progress | average progress (0–100) of the pillar's projects | ×20 | 2,000 |
| Consistency | fraction of the pillar's active habits with a **current streak > 0** | ×10 | 1,000 |

```
Pillar XP = round( habitRate×40 + goalRate×30 + projectRate×20 + consistency×10 )
```

Notes:
- `habitRate` uses the same frequency-aware expected-completions logic as the rest of the app
  (`frequency.ts`), over the trailing 90 days.
- `goalRate` is the average of each goal's derived progress (average completion rate of its
  associated habits since association).
- `projectRate` is the average task-completion progress of the pillar's projects.
- A pillar with no habits/goals/projects contributes 0.

## Overall XP

```
Overall XP = Σ (pillar XP)
```

## Level curve

- Cumulative XP to reach level L: `threshold(L) = 250 × (L − 1) × (L + 2)`
  (Level 1 = 0 · 2 = 1,000 · 3 = 2,500 · 4 = 4,500 · 5 = 7,000 · 6 = 10,000 · 10 = 27,000)
- XP to go from level L to L+1: `xpToNext(L) = 500 × (L + 1)` (L1→2 = 1,000; L2→3 = 1,500; …)
- Given total XP `x`: `level = max L` where `threshold(L) ≤ x`; within-level progress is
  `x − threshold(level)`. A perfect single pillar (10,000 XP) reaches level 6; a perfect overall
  score across the six default pillars (60,000 XP) reaches level 15.

## Rank

| Level | Rank |
|---|---|
| 1 | E |
| 2 | D |
| 3 | C |
| 4 | B |
| 5 | A |
| 6+ | S |

Applied per pillar and overall.

## API

- `GET /v1/progression` (authenticated) → `{ progression: { enabled, overall, pillars[] } }`.
  Each pillar entry includes `level`, `xp`, `xpIntoLevel`, `xpToNext`, `rank`, `rates` (the four
  source rates) and `breakdown` (the XP contribution of each source).
- XP is **derived on read** — nothing is stored, so it is always in sync with the current data and
  auditable.

---

_More docs: [Documentation index](../README.md) · [LifeOS README](../README.md) · [CHANGELOG](../../CHANGELOG.md)_
