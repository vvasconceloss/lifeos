# Changelog

All notable changes to LifeOS.

## v1.5.2 — UX & Feedback (2026-08)

A small product/UX release on top of the v1.5.1 hardening: the feedback entry point moved into the
header, the profile form got proper interactive states, and the release/PR process is now formalized.

### New features

- **Feedback in the header** — a GitHub icon button next to the theme toggle opens a dropdown with
  "Report a bug" and "Suggest a feature" links (matching the profile/logout popover, fully
  responsive). Replaces the Feedback card on the Profile page, which was overlapping the settings
  and the "Save changes" button.

### UX

- **Profile form polish** —
  - "Save changes" now shows a clear success state: the button turns green with a check, keeps its
    size, and is not clickable while saving or right after saving (in addition to the toast).
  - Name field has well-defined hover / focus / disabled states.
  - Empty name on save is blocked with an inline error (red border + "Name is required"), cleared
    as the user types.
  - The save button lives in a sticky bar aligned with the cards grid at the bottom right.

## v1.5.1 — Hardening & Quality (2026)

A hardening cycle focused on security, engineering quality and operations — no new product
features. Full roadmap and results in [`docs/roadmap/v1.5.1_IMPROVE.md`](docs/roadmap/v1.5.1_IMPROVE.md).

### Security

- 30-day session expiry (JWT `exp` + cookie `Max-Age`); expired tokens rejected with `401`.
- Data-isolation (IDOR) tests for every entity; cross-user access returns `404`.
- CSRF, CORS allow-list, rate limiting (login/register), password policy and cookie hardening
  audited and documented (`docs/SECURITY.md`).
- Dependency audit kept clean (`pnpm audit --prod` → 0 vulnerabilities).

### Quality & architecture

- **Standardized error contract** `{ error: { code, message, details? } }` on every endpoint,
  with shared types and a documented code map.
- **Coverage thresholds** enforced in CI (85/80/85/85); table-driven domain tests
  (frequencies, rates, streaks) and frontend unit tests for the critical logic.
- **6 ADRs** (monorepo, API, auth, validation, database, deployment) + architecture diagram and
  data-model ERD.
- **OpenAPI 3.0** contract served through Swagger UI (`GET /docs`).
- **Type-safety sweep:** 0 `any`; non-null assertions reduced from 22 to 2 (both justified).
- **Frontend:** route-level code-splitting cuts the initial bundle from 1.4 MB to 278 kB
  (87 kB gzip); accessibility and required UI states audited.

### Operations

- CI pipeline hardened: lint → typecheck → unit/integration/E2E tests → coverage → build → audit.
- Post-deploy smoke check workflow; automatic migrations on deploy.
- Practical **backup → restore** test verified; disaster recovery documented (RTO/RPO).

### Product

- Onboarding funnel documented; feedback mechanism added (Profile page links + GitHub issue
  templates); status page consciously discarded.

## v1.5.0 — Public Beta (2026-08)

The v1.5 release turns the v1.0 MVP into an intermediate product ready for other people to use.
Every phase was validated end-to-end (desktop + mobile) and covered by automated tests (API unit +
integration, frontend integration, and an E2E main-flow test) running in CI.

### New features

- **Habit frequencies** — habits can be `Daily`, specific `days of the week`, `X times per week`, or
  `X times per month`. Expected completions, completion rates and current/best streaks are computed
  per frequency; habits get an individual history + monthly calendar page (`/habits/:id`).
- **Analytics 2.0** — a dedicated **Insights** page (`/insights`) with weekly trend, consistency,
  daily average, completion-rate-over-time and per-pillar focus; **Statistics** (`/statistics`) keeps
  the monthly summary, per-pillar stats, top habits and the activity heatmap.
- **Goals** — outcomes associated with a pillar and linked to supporting habits; progress is derived
  from the habits' completion rates, with progress-over-time on the goal detail page.
- **Projects & Tasks** — structured work per pillar with a task checklist; project progress is
  derived from completed tasks, with task reordering and inline editing.
- **Daily Journal / Life Logs** — log mood, energy, sleep (hours + minutes) and notes per day;
  monthly mood calendar; a "logged days by state" card showing how many days fell in each
  sleep/mood/energy bucket.
- **Onboarding** — first-login detection with a 3-step wizard (areas → first habits → ready),
  default pillar/habit suggestions and a skip path; empty-state guidance for skipped users.
- **Personalization** — profile page (`/profile`) with name, theme (light/dark/system), timezone and
  week-start; pillar/habit icons, colors, descriptions and reordering.
- **Gamification / Progression** — optional (off by default) XP/levels/ranks derived transparently
  from habit completion, goal progress, project progress and consistency; per-pillar and overall
  ranks with a "How ranks work" legend. The nav item only appears when enabled.
- **Professional UX** — skeletons, standardized empty/error states, destructive-action confirmations,
  mobile-first dashboard (today checklist + scrollable heatmap), accessible keyboard navigation.
- **Public landing page** — a public `/` route explaining what LifeOS is, who it is for, what problem
  it solves and why it's different from a to-do list, with a "Get Started" CTA and SEO/OG tags.
- **Public demo account** — a shared demo account (`demo@lifeos.com`) seeded with realistic data,
  reachable via `POST /v1/auth/demo` and one-click from the landing page's "View Demo" button.

### Observability, security & operations

- Structured JSON logging (pino) with request IDs (`x-request-id`) and redacted secrets.
- Health checks: `/v1/health` (liveness) and `/v1/health/ready` (database readiness).
- Graceful shutdown (`SIGTERM`/`SIGINT` closes Fastify + Prisma).
- Rate limiting on global, login and register endpoints; password rules (min 8 chars, letter +
  number); secure cookies; CORS allow-list; Helmet; CSRF protection.
- Dependency audit kept clean (`pnpm audit` → 0 vulnerabilities).
- Production docs: `docs/ops/OPS.md`, `docs/ops/DEPLOYMENT.md`, `docs/features/GAMIFICATION.md`,
  `docs/domain/FREQUENCIES.md`, and a documentation hub at `docs/README.md`.

### Fixed

- **Analytics scale:** completion/success rates for the **current month** are now computed over
  the elapsed days only (`[month start → today]`), so a fully-on-track month reports 100% mid-month
  instead of being diluted by future days. Applied to `/stats/overview`, `/stats/monthly`,
  `/stats/analytics` (current week/month) and the dashboard success rate. Per-habit "goal" numbers
  (grid/mobile "X/goal") keep the full month as the target. Semantics documented in
  `docs/domain/FREQUENCIES.md` §5.1.
- **Dashboard/Statistics consistency:** the dashboard "monthly progress" is now capped at 100,
  matching the Statistics page, so a rate can never show above 100%.
- **Daily completions chart:** the whole line now reflects the month's progress — colored green
  (≥80% of the expected completions so far), amber (≥50%) or red (below) — so the chart reads as a
  single progress signal instead of per-day noise.

### Testing & CI/CD

- API suite: **238 tests** (auth, habits/frequency, completions/streaks, goals, projects,
  progression, daily logs, stats, isolation, plugins, demo account) including an **E2E main-flow test**
  (register → create pillar → create habit → complete habit → dashboard reflects progress).
- Frontend integration suite: **20 tests** (Vitest + Testing Library + MSW) covering login, register,
  dashboard view, completing a habit, creating a habit/goal, the demo login and demo isolation.
- GitHub Actions CI: lint → test → build on PR and `main` (with a Postgres service container).
- Deployment: API on **Render** (`render.yaml`, migrations run pre-deploy), web on **Vercel**
  (`apps/web/vercel.json`, Root Directory `apps/web`), **PostgreSQL on Neon**.

## v1.0.0 — MVP (2026-07)

The original MVP that proved the concept: a functional personal habit tracker.

- User accounts (register, login, cookie session).
- **Pillars** to organize life areas.
- **Habit** CRUD with monthly goals and archiving.
- Daily completion toggling (idempotent, unique per habit + day).
- Monthly dashboard grid with inline toggling and progress.
- Monthly statistics (completion rate, streaks, per-pillar aggregation) and a GitHub-style yearly
  activity heatmap.
