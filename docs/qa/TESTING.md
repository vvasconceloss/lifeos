# LifeOS — Testing & Coverage

> Result of **Phase 3 — Test Coverage and Critical E2E**
> (see [`docs/roadmap/IMPROVE_ROADMAP.md`](../roadmap/IMPROVE_ROADMAP.md)).

## How to run

```bash
pnpm test             # API + Web test suites
pnpm test:coverage    # the same, plus a coverage report with threshold checks
```

- **API:** `pnpm --filter @lifeos/api test` (Vitest, needs PostgreSQL — `DATABASE_URL`).
- **Web:** `pnpm --filter @lifeos/web test` (Vitest + Testing Library + MSW, jsdom).

## Coverage

Thresholds (checked by Vitest — the run **fails** below them):

| Metric | Threshold |
|---|---|
| Statements | 85% |
| Branches | 80% |
| Functions | 85% |
| Lines | 85% |

- **API:** covers `src/**/*.ts` (services, routes, plugins, `lib/`, domain logic), excluding
  tests and the generated Prisma client. Current: ~91% / 81% / 96% / 94%.
- **Web:** deliberately scoped to the **business-critical logic** — `src/lib`, `src/hooks`,
  `src/contexts`. UI components (pages, dialogs, cards, charts) are covered at the **flow level**
  by the integration tests (login, register, dashboard, completing a habit, creating a
  habit/goal). This is a conscious decision per the roadmap's rule "do not chase 100% — the focus
  is meaningful coverage of business rules". Current: ~95% / 92% / 92% / 95%.

CI runs `pnpm test:coverage`, so a drop below the thresholds fails the pipeline.

## Test pyramid

- **Unit / domain** (`src/lib/domain-rules.test.ts`, `frequency.test.ts`, `progression.lib.test.ts`):
  table-driven rules — expected completions and completion rate for every frequency type,
  current/best streaks, goal/project progress derivation, XP formula/curve/rank.
- **Contract / integration** (per module `*.test.ts`): endpoint behavior, validation, isolation,
  error contract, rate limits, health checks.
- **E2E** (`src/e2e.test.ts`): the full main flow over HTTP —
  register → onboarding → create habit → complete habit → dashboard (overview) →
  statistics (analytics) → goal progress — plus the **cross-user isolation** flow
  (register A/B → B cannot read/mutate A's data).
- **Failure scenarios** (`src/failure-scenarios.test.ts`): database unavailable (`/health/ready` →
  503), malformed JSON (400), invalid JWT (401), missing cookie (401), duplicate email (409).
  Expired JWT, invalid frequency/dates, nonexistent resources and rate limits are covered in the
  per-module suites.
- **Frontend integration** (`apps/web/src/test/*.test.tsx`): login, register, dashboard view,
  completing a habit, dashboard recovery after a failed load, and creating a habit/goal.

## Coverage gap policy

- Business rules must be unit-tested with tables (multiple scenarios, not just the happy path).
- Infrastructure (bootstrap files like `server.ts`, DB client, seed scripts) is not counted — it
  has no business logic.
- UI rendering is validated by flow-level integration tests rather than per-component unit tests,
  to keep the suite meaningful and low-noise.

---

_More docs: [Documentation index](../README.md) · [Error contract](../api/ERROR_CONTRACT.md) · [LifeOS README](../../README.md)_
