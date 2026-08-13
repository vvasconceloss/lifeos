# LifeOS — Improve ROADMAP (Portfolio Hardening)

> This is not a new functional version of the product — it's a cycle of **hardening, quality, and engineering maturity**, without adding new product features.
> Each phase includes: **objective**, **description/specs**, and **completion tasks** (checklist).

---

## Table of Contents

- [Phase 1 — Security Audit and Isolation](#phase-1--security-audit-and-isolation)
- [Phase 2 — Error Contract and Domain Testing](#phase-2--error-contract-and-domain-testing)
- [Phase 3 — Test Coverage and Critical E2E](#phase-3--test-coverage-and-critical-e2e)
- [Phase 4 — Architecture Documentation (ADRs, Diagram, ERD)](#phase-4--architecture-documentation-adrs-diagram-erd)
- [Phase 5 — API Contract and Database Review](#phase-5--api-contract-and-database-review)
- [Phase 6 — Code Quality and Boundaries](#phase-6--code-quality-and-boundaries)
- [Phase 7 — CI/CD Hardening and Production](#phase-7--cicd-hardening-and-production)
- [Phase 8 — Frontend Quality](#phase-8--frontend-quality)
- [Phase 9 — Product Polish](#phase-9--product-polish)
- [Phase 10 — GitHub Professionalization and Closure](#phase-10--github-professionalization-and-closure)

---

## Phase 1 — Security Audit and Isolation

### Objective
Systematically confirm, with tests, that LifeOS is protected against the most common vulnerabilities and that data isolation between users (multi-tenant) is guaranteed across all entities — not just assumed because of the documentation.

### Specs — Areas to audit
```text
Authentication
Authorization
IDOR
CSRF
XSS
SQL injection
CORS
Rate limiting
Password policy
Cookie configuration
Secrets
Error leakage
Input validation
Mass assignment
User isolation
Dependency vulnerabilities
```

### Specs — Critical isolation rule
```text
User A → /habits/{habitOfUserB}
```
This kind of access must be systematically impossible, not just "accidentally correct" because queries happen to be scoped by `userId`.

### Specs — Authorization testing pattern
It's not enough to test the happy path:
```text
user creates habit → 201
```
Cross-user access must be explicitly tested:
```text
User A creates habit
User B attempts GET habit A     → 404
User B attempts PATCH habit A   → 404
User B attempts DELETE habit A  → 404
```
Applied to: Habits, Completions, Goals, Projects, Daily Logs, Pillars.

### Tasks
- [x] Review authentication (login flow, session expiration, JWT) — added 30-day JWT/cookie expiry; expired tokens → 401 (tested)
- [x] Review authorization on all protected routes — `requireAuth` + `userId`-scoped queries everywhere
- [x] Systematically test IDOR scenarios across all entities — per-entity cross-user tests → 404 (see `docs/security.md`)
- [x] Confirm CSRF protection on all mutable endpoints — `@fastify/csrf-protection` globally on state-changing routes
- [x] Review XSS protection (input sanitization, output escaping) — React escapes all user input; no `dangerouslySetInnerHTML`
- [x] Confirm all queries use Prisma safely (no SQL injection via poorly built raw queries) — parameterized only; no user-input raw SQL
- [x] Review production CORS configuration — explicit `ALLOWED_ORIGINS` allow-list, wildcard rejected
- [x] Confirm rate limiting on sensitive endpoints (login, register) — 5/min and 10/min
- [x] Review and document the password policy (minimum requirements) — min 8 chars + letter + number (shared Zod)
- [x] Review cookie configuration (Secure, HttpOnly, SameSite) — `HttpOnly`, `SameSite=Strict`, `Secure` in prod, 30-day `Max-Age`
- [x] Audit secrets management (no secrets in versioned code) — `.env` ignored; only the intentional public demo credential is committed
- [x] Confirm error responses don't leak internal details (stack traces, queries, etc.) — generic 5xx, no stack traces
- [x] Review input validation on all endpoints (protection against mass assignment) — Zod at every boundary, unknown keys stripped
- [x] Write isolation tests (cross-user access) for Habits — `habit.test.ts`
- [x] Write isolation tests for Completions — `completion.test.ts`
- [x] Write isolation tests for Goals — `goal.test.ts`
- [x] Write isolation tests for Projects — `project.test.ts`
- [x] Write isolation tests for Daily Logs — `daily-log.test.ts`
- [x] Write isolation tests for Pillars — `pillar.test.ts`
- [x] Run a dependency audit (`npm audit` or equivalent) and resolve known vulnerabilities — `pnpm audit --prod` clean

### Completion criteria
A complete, documented security checklist exists, and all cross-user isolation tests pass for every entity in the system.
The full audit result and checklist are documented in [`docs/SECURITY.md`](../SECURITY.md).

---

## Phase 2 — Error Contract and Domain Testing

### Objective
Standardize the error response format across the entire API and create robust tests for the most complex business rules of the domain (frequencies, streaks, completion rates, goals, projects).

### Specs — Standardized error contract

```json
{
  "error": {
    "code": "HABIT_NOT_FOUND",
    "message": "Habit not found"
  }
}
```

Status code mapping:
```text
400 → validation error
401 → unauthenticated
403 → forbidden
404 → resource not found
409 → conflict
429 → rate limited
500 → internal error
```

### Specs — Domain tests (table-driven)
Non-trivial rules to cover: daily frequency, specific days, X times per week, X times per month, streaks, completion rates, derived goals, project progress, gamification.

Conceptual example:
```text
frequency       expected       completed       rate
daily           10             8               80%
weekly x3       6              5               83.3%
monthly x10     10             10              100%
```

### Tasks
- [x] Formally define the JSON schema for the error contract (`code` + `message`, and optional fields like `details`) — `{ error: { code, message, details? } }`, typed as shared `ApiErrorBody`/`ApiErrorResponse`
- [x] Map all existing error scenarios to the new contract — central message→code map in `apps/api/src/lib/errors.ts` (`toErrorBody`), default `APP_ERROR`
- [x] Refactor the `error-handler` plugin to ensure consistency across all endpoints — global handler + `validateInput` + `requireAuth` + rate-limit all emit the new shape
- [x] Write tests for each status code category (400/401/403/404/409/429/500) — `error-handler.test.ts` (404/500/client), auth (401/409/429), validation (400), not-found (404)
- [x] Document the error contract (for internal use and future API docs) — [`docs/api/ERROR_CONTRACT.md`](../api/ERROR_CONTRACT.md)
- [x] Create table-driven tests for completion rate calculation (daily frequency) — `domain-rules.test.ts`
- [x] Create table-driven tests for completion rate calculation (specific days of the week) — `domain-rules.test.ts`
- [x] Create table-driven tests for completion rate calculation (X times per week) — `domain-rules.test.ts`
- [x] Create table-driven tests for completion rate calculation (X times per month) — `domain-rules.test.ts`
- [x] Create tests for current streak and best streak across different scenarios — `domain-rules.test.ts` (table-driven) + `frequency.test.ts`
- [x] Create tests for Goal progress calculation derived from habits — `goal.test.ts` ("derives progress from associated habit completions")
- [x] Create tests for Project progress calculation derived from tasks — `project.test.ts` ("computes progress from completed tasks")
- [x] Create tests for gamification/XP rules (if applicable) — `progression.lib.test.ts` (formula/curve/rank)

### Completion criteria
All endpoints respond with the same standardized error format, and the most complex domain rules have table-driven tests covering multiple scenarios (not just the happy path).

---

## Phase 3 — Test Coverage and Critical E2E

### Objective
Measure and guarantee significant coverage of critical code, and expand E2E tests to cover complete flows and infrastructure failure scenarios — not just the happy path.

### Specs — Coverage thresholds
```text
Statements: 85%
Branches:   80%
Functions:  85%
Lines:      85%
```
Do not chase 100% — full coverage often encourages low-value tests. The focus is meaningful coverage of business rules.

### Specs — Main E2E flow (expanded)
```text
Register
 ↓
Onboarding
 ↓
Create habit
 ↓
Complete habit
 ↓
Dashboard
 ↓
Statistics
 ↓
Goal progress
```

### Specs — Isolation E2E flow
```text
Register A
Register B
 ↓
Create private data
 ↓
Attempt cross-user access
 ↓
Must fail
```

### Specs — Infrastructure failure scenarios to test
```text
database unavailable
malformed DATABASE_URL
expired JWT
invalid JWT
missing cookie
malformed JSON
duplicate email
invalid frequency
invalid dates
nonexistent resource
rate limit exceeded
```

### Tasks
- [x] Set up a coverage tool (e.g., Vitest/Jest coverage) on the backend — `@vitest/coverage-v8`, `vitest run --coverage`
- [x] Set up a coverage tool on the frontend — `@vitest/coverage-v8`, scoped to business-critical logic
- [x] Define coverage thresholds (statements/branches/functions/lines) — 85 / 80 / 85 / 85 in both configs
- [x] Integrate threshold checking into CI (fail the build if below threshold) — CI runs `pnpm test:coverage` (fails below thresholds)
- [x] Identify and cover test gaps in critical code (services, domain rules) — added table-driven domain tests, plus unit tests for web `errors`/`api`/`frequencyLabel`/`validation`/`use-theme`/`use-auth`
- [x] Expand the main E2E flow: register → onboarding → create habit → complete habit → dashboard → statistics → goal progress — `e2e.test.ts`
- [x] Implement the cross-user isolation E2E flow (register A/B → cross-user access must fail) — `e2e.test.ts`
- [x] Write a failure test for database unavailable — `/health/ready` → 503 (`failure-scenarios.test.ts`)
- [x] Write a failure test for expired JWT — `auth.test.ts`
- [x] Write a failure test for invalid JWT — `failure-scenarios.test.ts`
- [x] Write a failure test for missing cookie — `failure-scenarios.test.ts`
- [x] Write a failure test for malformed JSON — `failure-scenarios.test.ts`
- [x] Write a failure test for duplicate email — `failure-scenarios.test.ts` (+ `auth.test.ts`)
- [x] Write a failure test for invalid frequency — `habit-frequency.test.ts`
- [x] Write a failure test for invalid dates — `completion.test.ts` / `daily-log.test.ts`
- [x] Write a failure test for nonexistent resource — per-module 404 tests
- [x] Write a failure test for rate limit exceeded — `auth.test.ts` (login/register 429)

### Completion criteria
The coverage report confirms the defined thresholds are met, the critical E2E flows (including cross-user isolation) pass consistently, and there is test coverage for infrastructure failure scenarios, not just the happy path.

Full details: [`docs/qa/TESTING.md`](../qa/TESTING.md).

---

## Phase 4 — Architecture Documentation (ADRs, Diagram, ERD)

### Objective
Formally document the architectural decisions already made, turning "I used X" into "I made a well-reasoned technical decision," and create visual architecture and data-model diagrams.

### Specs — ADRs to create

```text
docs/architecture/
├── 001-monorepo.md
├── 002-api-architecture.md
├── 003-authentication.md
├── 004-shared-validation.md
├── 005-database.md
└── 006-deployment.md
```

Each ADR must answer:
```text
Context
Problem
Decision
Alternatives considered
Trade-offs
Consequences
```

Example:
> We decided to use HTTP-only cookies instead of storing the JWT in localStorage because...

### Specs — Architecture diagram

```text
                    ┌──────────────┐
                    │   Browser    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ React / Vite │
                    └──────┬───────┘
                           │ HTTPS
                           ▼
                    ┌──────────────┐
                    │   Fastify    │
                    │     API      │
                    └──────┬───────┘
                           │
                    ┌──────▼───────┐
                    │    Prisma    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ PostgreSQL   │
                    └──────────────┘
```
Also include: authentication, shared Zod, CI, and the hosting services used (e.g., Vercel, Render, Neon).

### Specs — ERD (data model)

```text
User
 ├── Pillars
 │    ├── Habits
 │    │    └── Completions
 │    ├── Goals
 │    └── Projects
 │         └── Tasks
 └── DailyLogs
```

### Tasks
- [x] Write ADR 001 — Monorepo (context, decision, alternatives, trade-offs) — `docs/architecture/001-monorepo.md`
- [x] Write ADR 002 — API Architecture — `002-api-architecture.md`
- [x] Write ADR 003 — Authentication (JWT + httpOnly cookie) — `003-authentication.md`
- [x] Write ADR 004 — Shared Validation (Zod shared between frontend/backend) — `004-shared-validation.md`
- [x] Write ADR 005 — Database (PostgreSQL + Prisma) — `005-database.md`
- [x] Write ADR 006 — Deployment (chosen production architecture) — `006-deployment.md`
- [x] Create the full architecture diagram (with auth, validation, CI, and hosting) — `docs/architecture/008-diagrams.md`
- [x] Embed the architecture diagram in `README.md` — added an Architecture section
- [x] Create the full data model ERD (User → Pillars → Habits/Goals/Projects → Completions/Tasks, DailyLogs) — `008-diagrams.md`
- [x] Embed the ERD in the documentation (README or `docs/architecture/`) — README + `008-diagrams.md`
- [x] Review whether the ADRs faithfully reflect the decisions actually made in the code — each ADR maps to its code location (plugins, `lib/`, routes, deploy config)

### Completion criteria
There are at least 6 complete ADRs documenting the core architectural decisions, a visual architecture diagram, and a data-model ERD, both accessible from `README.md`.

---

## Phase 5 — API Contract and Database Review

### Objective
Formally document the API contract (OpenAPI) and perform a systematic review of the database (indexes, constraints, cascade behavior, pagination), ensuring performance decisions are justified rather than accidental.

### Specs — OpenAPI specification

```text
GET    /v1/habits
POST   /v1/habits
PATCH  /v1/habits/:id
DELETE /v1/habits/:id

POST   /v1/auth/login
POST   /v1/auth/register
...
```

Must include: schemas, request bodies, responses, status codes, authentication, error responses. Ideally accessible in the development environment.

### Specs — Database review
Systematically verify:
```text
indexes
unique constraints
foreign keys
cascade behavior
nullable fields
transaction boundaries
query efficiency
N+1
pagination
ordering
migration safety
```

Special attention to frequent queries:
```text
WHERE userId = ?
WHERE habitId = ? AND date = ?
```
These must have adequate indexes.

### Specs — Pagination
For endpoints with potentially large lists:
```text
GET /habits
GET /projects
GET /daily-logs
```
Consider `?page=1&limit=20` or cursor pagination when appropriate. Do not add pagination artificially to small tables — justify the decision in writing.

### Tasks
- [x] Choose the tool/format to generate the OpenAPI specification (e.g., auto-generated via Zod/Fastify or written manually) — hand-curated OpenAPI 3.0 in `apps/api/src/openapi.ts`, served via `@fastify/swagger` (static mode)
- [x] Document all `auth` endpoints in the OpenAPI specification — register/login/demo/logout/me/onboarding
- [x] Document all `pillars` endpoints in the specification — CRUD + reorder
- [x] Document all `habits` and `completions` endpoints in the specification — CRUD/archive/history + completions
- [x] Document all `goals` endpoints in the specification — CRUD + habit association
- [x] Document all `projects` and `tasks` endpoints in the specification — CRUD + tasks/reorder
- [x] Document all `daily-logs` endpoints in the specification — list/upsert/by-date/correlations
- [x] Document the error contract (Phase 2) in the OpenAPI specification — shared `Error` component + standard 400/401/404/409/429 responses
- [x] Expose the OpenAPI documentation in the development environment (e.g., Swagger UI) — **Swagger UI at `GET /docs` (API host)** (+ `/docs/json`, `/docs/yaml`) via `@fastify/swagger-ui`
- [x] Review existing indexes against the application's most frequent queries — all covered (see `docs/database-review.md`)
- [x] Add missing indexes for queries by `userId` and critical combinations (e.g., `habitId` + `date`) — none missing: `userId` indexed per entity; `HabitCompletion` `@@unique([habitId, date])`
- [x] Review existing unique constraints and confirm they cover all required business rules — email, daily-log (userId,date), completion (habitId,date), goal-habit link
- [x] Review cascade behavior on all foreign keys — ownership cascades; pillar children `Restrict` (documented)
- [x] Review nullable fields and justify each one — every nullable column is optional/presentational (documented)
- [x] Review transaction boundaries in multi-table operations — onboarding/reorder/demo-seed are atomic `$transaction`s
- [x] Identify and fix existing N+1 queries — none; stats/goals/projects use batched/aggregated queries
- [x] Decide and justify, endpoint by endpoint, whether pagination is needed — **not paginated**; per-user lists are small and bounded (documented)
- [x] Implement pagination on endpoints where the need is justified — n/a (no justified need)
- [x] Review the safety of existing migrations (reversibility, production impact) — additive migrations; backfilled data migration without loss

### Completion criteria
A complete, accessible OpenAPI specification exists covering all endpoints, and a documented database review exists, with indexes added where necessary and pagination decisions explicitly justified.

- OpenAPI + Swagger UI: [`docs/api/OPENAPI.md`](../api/OPENAPI.md)
- Database review: [`docs/DATABASE_REVIEW.md`](../DATABASE_REVIEW.md)

---

## Phase 6 — Code Quality and Boundaries

### Objective
Ensure TypeScript is genuinely type-safe, that the modular architecture is consistent throughout the project, and that clear boundaries exist between HTTP, validation, domain logic, and persistence.

### Specs — TypeScript review
Look for and eliminate/justify:
```text
any
unnecessary casts
as
non-null assertions (!)
duplicated types
duplicated business logic
overly broad types
unsafe external input
inconsistent return types
```
Goal: genuinely type-safe TypeScript, not JavaScript with TypeScript on top.

### Specs — Module convention
```text
module/
├── routes
├── service
├── schemas
├── tests
└── types
```
Confirm all modules follow this convention, with no unjustified exceptions.

### Specs — Accidental complexity
Look for:
```text
functions > ~50 lines
giant React components
services doing too many things
hooks mixing responsibilities
duplicated queries
UI logic containing domain rules
```
Not a rigid mathematical rule — a design review.

### Specs — Explicit boundaries
```text
HTTP
 ↓
Validation
 ↓
Application/service
 ↓
Domain logic
 ↓
Persistence
```
Rule: a question like "how is completion rate calculated?" should not depend on Fastify, HTTP, or React.

### Tasks
- [x] Do a full sweep for uses of `any` and replace/justify each occurrence — **0 occurrences** in source
- [x] Sweep for unnecessary casts (`as`) and remove them where possible — inventory documented; remaining casts are boundary/Prisma/plugin-option casts (see `docs/architecture/007-layering.md`)
- [x] Sweep for non-null assertions (`!`) and replace with safe checks — removed 15 (14 in `demo.service.ts` via a `requireIndex` helper, 1 in `habit-detail.tsx`); 2 justified remain
- [x] Identify and eliminate duplicated types (consolidate into `packages/shared`) — shared types are the single source; frontend re-declares the JSON wire shape (dates as `string`) as a documented exception
- [x] Identify and eliminate duplicated business logic between modules — none duplicated; shared `lib/` (frequency/stats/progression) is reused
- [x] Review overly broad types (e.g., `object`, `Record<string, any>`) and narrow them — `Record<string, …>` only for dictionaries/payloads; no `any`
- [x] Review validation of unsafe external inputs (ensure Zod at all boundaries) — all bodies/params/query validated via shared Zod + `validateInput`
- [x] Standardize inconsistent return types between similar services — all services return `{ resource } | { error, status }` or `true | { error, status }`
- [x] Audit all modules and confirm they follow the `routes/service/schemas/tests/types` convention — all conform
- [x] Fix or justify exceptions to the module convention — auth carries demo/onboarding services; stats has `utils`; progression has `lib` (all within the convention)
- [x] Identify functions over ~50 lines and evaluate the need for refactoring — reviewed; largest (`stats.service.getAnalytics`) is cohesive and its math lives in pure `lib/` helpers
- [x] Identify excessively large React components and evaluate the need for splitting — split into subcomponents where needed (`TaskRow`, `JournalDayCard`, …)
- [x] Identify services that accumulate too many responsibilities and evaluate separation — none accumulate unrelated domains
- [x] Identify hooks mixing responsibilities and evaluate separation — hooks are thin (auth/theme/dashboard data)
- [x] Extract domain logic "hidden" in UI components into the service layer — none found; domain rules live in `lib/`
- [x] Document the HTTP → Validation → Service → Domain → Persistence boundaries (even informally, in `docs/architecture/007-layering.md`) — created

### Completion criteria
A full sweep of `any`/`as`/`!` has been done with explicit justification for the remaining cases, all modules follow the defined structural convention, and domain logic can be explained and tested without depending on HTTP, Fastify, or React.

Full results: [`docs/architecture/007-layering.md`](../architecture/007-layering.md).

---

## Phase 7 — CI/CD Hardening and Production

### Objective
Elevate the existing CI/CD pipeline (install → Prisma generate → migrations → lint → test → build) into a more robust pipeline, with deployment verification and evidence of operational responsibility.

### Specs — Target pipeline

```text
PR
 │
 ├── lint
 ├── typecheck
 ├── unit tests
 ├── integration tests
 ├── E2E
 ├── build
 └── dependency audit
       │
       ▼
    merge
       │
       ▼
   deployment
       │
       ├── migration
       ├── health check
       └── smoke test
```

Highlights: coverage threshold, E2E in CI, build artifacts, deployment verification, documented rollback.

### Specs — Backup/restore
Practically demonstrate:
```text
backup
 ↓
destroy database
 ↓
restore
 ↓
verify integrity
```

### Specs — Disaster recovery (lightweight document)
```text
RTO: X
RPO: Y

Database failure:
1. ...
2. ...
3. ...

Application failure:
1. ...
2. ...
```
Doesn't need to be enterprise-grade, but should demonstrate production-minded thinking.

### Tasks
- [x] Add a dedicated `typecheck` step to CI (separate from lint) — `pnpm typecheck` (api `tsc --noEmit` + web `tsc -b`)
- [x] Add a dedicated `unit tests` step to CI — `pnpm --filter @lifeos/api test:unit` (`src/lib`)
- [x] Add a dedicated `integration tests` step to CI — `pnpm --filter @lifeos/api test:integration` (modules + plugins + app)
- [x] Integrate the E2E tests (Phase 3) into the CI pipeline — `pnpm --filter @lifeos/api test:e2e` (e2e + failure scenarios)
- [x] Add a `dependency audit` step (e.g., `npm audit`) to CI — `pnpm audit --prod`
- [x] Integrate the coverage threshold check (Phase 3) into CI — `pnpm test:coverage` (full suite, fails below thresholds)
- [x] Configure build artifact generation in the pipeline — `pnpm build` step (tsup bundle + web `dist`)
- [x] Configure automatic migration execution on deployment — Render `preDeployCommand` (`prisma migrate deploy`) + `db:migrate` in CI
- [x] Configure an automatic post-deploy health check — Render `healthCheckPath: /v1/health/ready`
- [x] Configure an automatic post-deploy smoke test — `.github/workflows/post-deploy.yml` (health + web after push to `main`)
- [x] Document the rollback process in case of deployment failure — `docs/ops/DEPLOYMENT.md` (Render/Vercel "Rollback to this deploy")
- [x] Run a practical test of backup → destroy → restore → integrity verification of the database — executed with `pg_dump`/`psql` (PostgreSQL 17): 1u/1p/1h/1c before and after
- [x] Document the steps and result of the backup/restore test — `docs/ops/DISASTER_RECOVERY.md`
- [x] Write a lightweight disaster recovery document (RTO/RPO, database failure, application failure) — `docs/ops/DISASTER_RECOVERY.md`

### Completion criteria
The CI/CD pipeline covers lint, typecheck, unit tests, integration tests, E2E, build, and dependency audit before merge, deployment includes automatic verification (health check + smoke test), and there is documented evidence of a real backup/restore test, plus a lightweight disaster recovery document.

- Pipeline: `.github/workflows/ci.yml` + `.github/workflows/post-deploy.yml`
- DR + backup/restore evidence: [`docs/ops/DISASTER_RECOVERY.md`](../ops/DISASTER_RECOVERY.md)

---

## Phase 8 — Frontend Quality

### Objective
Ensure accessibility, real responsiveness, consistent UI states, and measurable basic performance across the entire frontend.

### Specs — Accessibility
Verify:
```text
keyboard navigation
focus states
semantic HTML
labels
ARIA
contrast
dialogs
screen reader
form errors
```

### Specs — Required UI states
Every important operation must cover:
```text
Loading
Empty
Success
Error
Retry
Disabled
Optimistic/pending
```
Especially: login, register, habit creation, completion, goal creation, project/task manipulation.

### Specs — Real responsiveness
Test at concrete breakpoints:
```text
320px
375px
768px
1024px
1440px
```
Fix overflow, inadequate touch targets, or broken layouts.

### Specs — Basic performance
Use Lighthouse/PageSpeed and analyze:
```text
initial bundle
lazy loading
image optimization
unnecessary renders
API waterfall
database queries
frontend caching
```
No premature optimization — the goal is to find measurable problems.

### Tasks
- [ ] Audit keyboard navigation across all main flows
- [ ] Audit visible focus states on all interactive elements
- [ ] Review the use of semantic HTML across all main pages
- [ ] Review labels on all forms
- [ ] Audit ARIA usage where needed (dialogs, alerts, live regions)
- [ ] Verify color contrast (text/background) across the design system
- [ ] Audit dialog/modal behavior (focus trap, escape to close)
- [ ] Test main flows with a basic screen reader
- [ ] Review form error messages for clarity and correct field association
- [ ] Audit and standardize the loading state in login/register/habit creation/completion/goal creation/project-task manipulation
- [ ] Audit and standardize the empty state in the same areas
- [ ] Audit and standardize the error state with a retry option in the same areas
- [ ] Audit and standardize disabled states during async operations
- [ ] Audit optimistic/pending updates where they make sense (e.g., marking a habit)
- [ ] Test the application at 320px and fix issues found
- [ ] Test the application at 375px and fix issues found
- [ ] Test the application at 768px and fix issues found
- [ ] Test the application at 1024px and fix issues found
- [ ] Test the application at 1440px and fix issues found
- [ ] Run Lighthouse/PageSpeed on the main pages and document the results
- [ ] Analyze and optimize the initial bundle if necessary
- [ ] Implement lazy loading where it makes sense
- [ ] Optimize images (format, size, lazy loading)
- [ ] Identify and fix unnecessary re-renders in critical components
- [ ] Identify and fix API waterfalls (sequential requests that could be parallel)

### Completion criteria
A documented accessibility audit exists with fixed issues, all required UI states are implemented in critical operations, the application has been validated and fixed across at least 5 breakpoints, and a performance report (Lighthouse/PageSpeed) exists with measurable optimizations applied.

---

## Phase 9 — Product Polish

### Objective
Add a final layer of product maturity: conceptually measure onboarding, and (optionally) add lightweight feedback and operational transparency mechanisms — without falling into overengineering.

### Specs — Onboarding funnel (conceptual)
```text
Landing
 ↓
Demo
 ↓
Register
 ↓
Onboarding completed
 ↓
First habit
 ↓
First completion
 ↓
7-day retention
```
Even without external analytics, these events can be defined conceptually (and optionally instrumented). This turns the project from "I built an app" into "I built and evaluated a product."

### Specs — Feedback mechanism (optional, lightweight)
```text
Report a bug
Suggest a feature
```
No need to build a full system — it can simply be GitHub Issues with templates (directly tied to Phase 10).

### Specs — Status page (optional)
```text
LifeOS Status

Web              Operational
API              Operational
Database         Operational
Last deployment  ...
```
For a personal project, this can be overengineering — only implement it if the goal is to demonstrate operational thinking.

### Tasks
- [ ] Define and document the onboarding funnel conceptually (landing → demo → register → onboarding → first habit → first completion → 7-day retention)
- [ ] Evaluate whether it's worth instrumenting any of these events (e.g., simple logging, no external tool)
- [ ] Document the funnel in the README or in `docs/product/`
- [ ] Decide whether to implement a feedback mechanism (bug/feature request)
- [ ] If yes: create a "Report a bug" / "Suggest a feature" link/button pointing to GitHub Issues
- [ ] Decide whether a public status page is worth implementing (evaluate if it's overengineering for this context)
- [ ] If yes: implement a simple status page (Web/API/Database/Last deployment)

### Completion criteria
The onboarding funnel is documented conceptually and serves as evidence of product thinking, and decisions about the feedback mechanism and status page were made consciously (implemented or explicitly discarded with justification, to avoid overengineering).

---

## Phase 10 — GitHub Professionalization and Closure

### Objective
Give the repository the appearance and behavior of a professional project (even as a solo developer), consolidate releases, and formally close this LifeOS hardening cycle as the main portfolio project.

### Specs — Issue templates and PR template

```text
.github/
├── ISSUE_TEMPLATE/
│   ├── bug.yml
│   └── feature.yml
└── pull_request_template.md
```

### Specs — Releases
Versioning already exists (`v1.5.0`). Formalize it as real releases:
```text
v1.0.0 — MVP
v1.1.0
v1.2.0
v1.5.0 — Public Beta
```
Each release with: features, breaking changes, migrations, known issues.

### Specs — Commit history (from now on)
Do not rewrite the existing history. From this point forward, use the convention:
```text
feat:
fix:
refactor:
test:
docs:
ci:
chore:
```
with atomically related commits.

### Specs — Branch protection
Configure `main` to require `CI passing` before merge, even as a solo developer.

### Specs — GitHub Discussions (optional)
For feature discussions, architecture decisions, and feedback. Not mandatory, but improves the appearance of a public project.

### Tasks
- [ ] Create `.github/ISSUE_TEMPLATE/bug.yml`
- [ ] Create `.github/ISSUE_TEMPLATE/feature.yml`
- [ ] Create `.github/pull_request_template.md`
- [ ] Review the existing release history and formalize it as GitHub Releases (v1.0.0 through v1.5.0)
- [ ] Write release notes for each formalized version (features, breaking changes, migrations, known issues)
- [ ] Create the release for this hardening cycle (e.g., `v1.5.1`) with a changelog focused on quality/security/architecture
- [ ] Adopt the commit convention (`feat/fix/refactor/test/docs/ci/chore`) from now on
- [ ] Configure branch protection on `main` requiring CI passing before merge
- [ ] Evaluate and, if it makes sense, enable GitHub Discussions
- [ ] Do a final polish of `README.md` (badges, architecture diagram, ERD, links to ADRs, OpenAPI, screenshots)
- [ ] Review whether the repository, as a whole, communicates professionalism to a technical recruiter opening it for the first time
- [ ] Validate the closure criteria (see "Stop Criteria" section below)

### Completion criteria
The repository has issue/PR templates, formalized releases with changelogs, active branch protection on `main`, a commit convention in use, and a `README.md` that serves as a complete entry point (architecture, ERD, ADRs, API docs, screenshots) for anyone evaluating the project for the first time.
