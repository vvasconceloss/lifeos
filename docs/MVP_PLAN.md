# LifeOS — Complete MVP Plan

> Reference document for development, phase by phase, from Foundation to Deployment.
> Each phase includes: **objective**, **description/specs**, and **completion tasks** (checklist).

---

## Table of Contents

- [Phase 0 — Foundation](#phase-0--foundation)
- [Phase 1 — Contracts and Core Rules](#phase-1--contracts-and-core-rules)
- [Phase 2 — Authentication (Backend)](#phase-2--authentication-backend)
- [Phase 3 — Authentication (Frontend)](#phase-3--authentication-frontend)
- [Phase 4 — Pillars](#phase-4--pillars)
- [Phase 5 — Habits](#phase-5--habits)
- [Phase 6 — Habit Completion](#phase-6--habit-completion)
- [Phase 7 — Dashboard](#phase-7--dashboard)
- [Phase 8 — Weekly Tracker](#phase-8--weekly-tracker)
- [Phase 9 — Basic Statistics](#phase-9--basic-statistics)
- [Phase 10 — Heatmap](#phase-10--heatmap)
- [Phase 11 — UX Improvements](#phase-11--ux-improvements)
- [Phase 12 — Security and Robustness](#phase-12--security-and-robustness)
- [Phase 13 — CI](#phase-13--ci)
- [Phase 14 — Deployment](#phase-14--deployment)
- [MVP "Done" Definition](#mvp-done-definition)
- [Milestones Summary](#milestones-summary)

---

## Phase 0 — Foundation

**Status:** ✅ Completed

### Objective
Have an executable base: monorepo, backend, frontend, and database communicating with each other.

### Specs
- Monorepo managed with `pnpm workspaces`.
- `apps/api` — Fastify + TypeScript server.
- `apps/web` — React + Vite application.
- `packages/shared` — shared types and utilities.
- PostgreSQL via Docker Compose.
- Prisma as ORM.

### Tasks
- [x] Create monorepo with `pnpm workspaces`
- [x] Set up `apps/api`
- [x] Set up `apps/web`
- [x] Set up `packages/shared`
- [x] Configure TypeScript across all packages
- [x] Configure Fastify
- [x] Configure React + Vite
- [x] Implement `/health` endpoint
- [x] Confirm the frontend starts without errors
- [x] Confirm the frontend communicates with the API
- [x] Configure PostgreSQL via Docker
- [x] Configure Prisma
- [x] Create the first migration
- [x] Write the first automated test
- [x] Create initial `README.md`
- [x] Create `.gitignore`
- [x] Make the first commit

### Completion criteria
API and frontend run locally, communicate with each other, and there is a database connected via Prisma with at least one migration applied.

---

## Phase 1 — Contracts and Core Rules

### Objective
Before writing any product code, define the initial data model and the business rules that will govern the entire MVP.

### Specs — Data model

```text
User
 └── Pillar
      └── Habit
           └── HabitCompletion
```

Decision: include `Pillar` from the start (Option A), keeping it extremely simple:

```text
Pillar
- id
- userId
- name
- createdAt
```

No goals, levels, or metrics at this stage.

### Specs — Business rules

**User**
- `email` is unique.
- `password` is never stored in plaintext (hashing required).
- A user can only access their own data.

**Pillar**
- Belongs to exactly one user.
- A user can only see their own pillars.
- A pillar can have multiple habits.

**Habit**
- Belongs to a user.
- Belongs to a pillar.
- Can be archived.
- Archived habits do not appear as active.

**Habit Completion**
- Belongs to a habit.
- At most one completion per habit per day.
- Uniqueness constraint: `@@unique([habitId, date])` enforced at the database level.

### Tasks
- [x] Document the entity diagram (User → Pillar → Habit → Completion)
- [x] Write the business rules for each entity into a reference document (`/docs/domain-rules.md`)
- [x] Validate with mental test cases (e.g., "can I mark the same habit twice on the same day?")
- [x] Confirm the `@@unique([habitId, date])` constraint is planned in the Prisma schema
- [x] Review and approve the model before moving to Phase 2

### Completion criteria
An approved domain document exists, with the entity model and business rules written down, before any product code is written.

---

## Phase 2 — Authentication (Backend)

### Objective
A user can create an account and authenticate via the API. First real vertical slice of the product.

### Specs — Prisma model

```prisma
model User {
  id           String   @id @default(uuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  pillars      Pillar[]
}
```

### Specs — Module structure

```text
apps/api/src/modules/auth/
├── auth.routes.ts
├── auth.service.ts
├── auth.schemas.ts
└── auth.types.ts
```

### Specs — Endpoints

| Method | Route             | Description                |
|--------|-------------------|-----------------------------|
| POST   | `/auth/register`  | Creates a new user          |
| POST   | `/auth/login`     | Authenticates a user        |
| GET    | `/auth/me`        | Returns the current session |

Example `POST /auth/register`:

```json
// Request
{ "email": "victor@example.com", "password": "password" }

// Response
{ "user": { "id": "...", "email": "victor@example.com" }, "token": "..." }
```

### Specs — Authentication decision
- Mechanism: **JWT**.
- Storage: **httpOnly cookie** (preferred for a traditional web product, even though it requires correctly configured CORS/CSRF).
- Do not let this decision block development — it can be adjusted later.

### Tasks
- [x] Create the `User` model in Prisma
- [x] Run the `add_users` migration
- [x] Implement `auth.schemas.ts` with validation (Zod) for register/login
- [x] Implement `auth.service.ts` (password hashing, JWT generation/verification)
- [x] Implement `POST /auth/register`
- [x] Implement `POST /auth/login`
- [x] Implement `GET /auth/me`
- [x] Configure JWT in an httpOnly cookie
- [x] Configure basic CORS and CSRF
- [x] Write tests:
  - [x] Register a user successfully
  - [x] Reject a duplicate email
  - [x] Reject an invalid password
  - [x] Log in successfully
  - [x] Reject incorrect credentials
  - [x] Access `/auth/me` while authenticated
  - [x] Reject `/auth/me` without authentication

### Completion criteria
All authentication tests pass, and it is possible to register, authenticate, and validate a session via direct API calls (e.g., Postman/curl).

---

## Phase 3 — Authentication (Frontend)

### Objective
Functional register/login interface, with session management and route protection.

### Specs — Pages

```text
/login
/register
```

### Specs — Session state
- `AuthProvider` (or equivalent) to hold the current user in a React context.
- `ProtectedRoute` to block access to authenticated pages.

### Specs — Flow

```text
User → Login Form → POST /auth/login → API → Cookie → GET /auth/me → Authenticated App
```

Routing behavior:

```text
Not authenticated → redirects to /login
Authenticated     → access to /app
```

### Tasks
- [x] Create `/register` page with form and field validation
- [x] Create `/login` page with form and field validation
- [x] Implement `AuthProvider` (global session context)
- [x] Implement call to `GET /auth/me` on app startup
- [x] Implement `ProtectedRoute`
- [x] Implement automatic redirect to `/login` when not authenticated
- [x] Implement redirect to `/app` after successful login
- [x] Handle and display authentication errors (duplicate email, invalid credentials)
- [x] Manually test the full flow: register → login → page refresh → session persists

### Completion criteria
A user can register, log in, navigate to a protected route, refresh the page without losing the session, and is correctly redirected when not authenticated.

---

## Phase 4 — Pillars

### Objective
The user can define the fundamental areas of their life (pillars).

### Specs — Prisma model

```prisma
model Pillar {
  id        String   @id @default(uuid())
  name      String
  userId    String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user   User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  habits Habit[]

  @@index([userId])
}
```

### Specs — Endpoints

| Method | Route           | Description              |
|--------|-----------------|----------------------------|
| GET    | `/pillars`      | Lists the user's pillars    |
| POST   | `/pillars`      | Creates a pillar            |
| PATCH  | `/pillars/:id`  | Edits a pillar               |
| DELETE | `/pillars/:id`  | Removes a pillar             |

### Specs — Business rule
It is not allowed to delete a pillar that still has associated habits (the user must move/archive the habits first). This approach was preferred over auto-archiving, since it is more explicit.

### Specs — Frontend

Page: `/pillars` (or `/settings/pillars`)

Features:
- View pillars
- Create pillar
- Edit name
- Delete pillar (only if empty)

Suggested default pillars (created manually in the MVP, automation comes later):
```text
Health · Engineering · Knowledge · Relationships · Leisure · Inner Growth
```

### Tasks
- [x] Create the `Pillar` model in Prisma and run the migration
- [x] Implement `GET /pillars` (filtered by authenticated `userId`)
- [x] Implement `POST /pillars`
- [x] Implement `PATCH /pillars/:id`
- [x] Implement `DELETE /pillars/:id` with the "do not delete if it has habits" validation
- [x] Write backend tests for all endpoints (including the delete error case)
- [x] Create the `/pillars` frontend page
- [x] Implement pillar listing
- [x] Implement pillar creation (form/modal)
- [x] Implement name editing
- [x] Implement deletion with error feedback when the pillar is not empty
- [x] Test the full flow: create, edit, try to delete with habits, delete when empty

### Completion criteria
The user can fully manage their pillars through the interface, and the deletion business rule is enforced both in the backend and reflected in the UI.

---

## Phase 5 — Habits

### Objective
First major product feature: habit creation and management.

### Specs — Prisma model

```prisma
model Habit {
  id          String    @id @default(uuid())
  name        String
  description String?
  userId      String
  pillarId    String
  isActive    Boolean   @default(true)
  createdAt   DateTime  @default(now())
  archivedAt  DateTime?

  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)
  pillar      Pillar            @relation(fields: [pillarId], references: [id], onDelete: Restrict)
  completions HabitCompletion[]

  @@index([userId])
  @@index([pillarId])
}
```

### Specs — Frequency (scope decision)
No complex frequencies at this stage (nothing like "every Monday", "4 times a week", etc.). The MVP uses only:
```text
frequency: DAILY
```

### Specs — Endpoints

| Method | Route                    | Description         |
|--------|--------------------------|------------------------|
| GET    | `/habits`               | Lists habits           |
| POST   | `/habits`               | Creates a habit         |
| GET    | `/habits/:id`           | Habit detail            |
| PATCH  | `/habits/:id`           | Edits a habit           |
| DELETE | `/habits/:id`           | Removes a habit         |
| POST   | `/habits/:id/archive`   | Archives a habit        |

Example creation payload:
```json
{
  "name": "Code",
  "description": "Work on my growth as an engineer",
  "pillarId": "engineering-id"
}
```

### Specs — Frontend

`/habits` page, grouped by pillar:

```text
Engineering
 ├── Code
 └── Study architecture

Health
 └── Train
```

Focus: functional CRUD. No charts at this stage.

### Tasks
- [x] Create the `Habit` model in Prisma and run the migration
- [x] Implement `GET /habits` (filtered by user, with an option to hide archived ones)
- [x] Implement `POST /habits`
- [x] Implement `GET /habits/:id`
- [x] Implement `PATCH /habits/:id`
- [x] Implement `DELETE /habits/:id`
- [x] Implement `POST /habits/:id/archive`
- [x] Write backend tests for all endpoints
- [x] Create the `/habits` frontend page
- [x] Implement listing grouped by pillar
- [x] Implement habit creation (with pillar selection)
- [x] Implement habit editing
- [x] Implement habit archiving
- [x] Confirm archived habits do not appear in the active list
- [x] Test the full flow: create habit, associate with pillar, edit, archive

### Completion criteria
The user can create, edit, archive, and list habits organized by pillar, with all Phase 1 business rules respected.

---

## Phase 6 — Habit Completion

### Objective
Core MVP feature: marking habits as completed per day.

### Specs — Prisma model

```prisma
model HabitCompletion {
  id        String   @id @default(uuid())
  habitId   String
  date      DateTime
  createdAt DateTime @default(now())

  habit Habit @relation(fields: [habitId], references: [id], onDelete: Cascade)

  @@unique([habitId, date])
  @@index([habitId, date])
}
```

### Specs — Endpoints (idempotent design)

| Method | Route                              | Description                                    |
|--------|--------------------------------------|--------------------------------------------------|
| GET    | `/completions?from=...&to=...`      | Lists completions within a date range             |
| PUT    | `/habits/:id/completions/:date`     | Ensures the habit is completed on that date       |
| DELETE | `/habits/:id/completions/:date`     | Removes the completion for that date              |

Decision: use `PUT` (not `POST`) because the operation is idempotent — repeating the same request does not create duplicates.

### Specs — Main product flow

```text
Login → Dashboard → Habit → Mark as completed → API → PostgreSQL → Dashboard updates
```

### Tasks
- [x] Create the `HabitCompletion` model in Prisma and run the migration (with the `@@unique` constraint)
- [x] Implement `GET /completions` with date range filtering
- [x] Implement `PUT /habits/:id/completions/:date` (idempotent)
- [x] Implement `DELETE /habits/:id/completions/:date`
- [x] Write tests:
  - [x] Mark a habit as completed
  - [x] Marking the same habit twice on the same day does not duplicate the record
  - [x] Unmark a completed habit
  - [x] List completions within a date range
- [x] Add the "mark as completed" interaction in the habits/dashboard UI
- [x] Test the end-to-end flow: login → mark habit → refresh → state persists

### Completion criteria
The user can mark and unmark habits as completed on any date, with uniqueness guaranteed at the database level, and the state is correctly reflected in the interface.

---

## Phase 7 — Dashboard

### Objective
Build the core experience of the product: quickly answer "what did I do today?" and "how is my week going?".

### Specs — Layout

```text
Dashboard

Today's Progress
██████░░░░ 60%

Health
├── ✓ Train
└── ○ Sleep 7+ hours

Engineering
├── ✓ Code
└── ○ Study Architecture

Knowledge
└── ✓ Read

Relationships
└── ○ Quality Time
```

### Specs — Interaction
- Each habit must be markable with a single click.
- Flow: `click → completed → visual feedback`, with no modal and no page navigation.
- The most frequent action in the app must be the fastest to perform.

### Tasks
- [x] Create the `/dashboard` page (or main route `/app`)
- [x] Implement "Today's Progress" calculation (% of habits completed today)
- [x] Implement habit listing grouped by pillar, with today's status
- [x] Implement inline completion toggle (no modal, no navigation)
- [x] Implement immediate visual feedback (optimistic or with minimal loading)
- [x] Handle empty states (no habits created yet)
- [x] Test basic responsiveness of the dashboard
- [x] Validate performance of the mark/unmark interaction (must feel instant)

### Completion criteria
The dashboard correctly shows today's progress, grouped by pillar, and allows marking/unmarking habits with a single click and immediate feedback.

---

## Phase 8 — Weekly Tracker

### Objective
Provide the weekly view of habits, in a table format (days of the week × habits).

### Specs — Layout

```text
             Mon Tue Wed Thu Fri Sat Sun

Code          ✓   ✓   ✓   ✓   ○   ✓   ○
Train         ○   ✓   ○   ✓   ○   ✓   ○
Read          ✓   ○   ✓   ○   ✓   ○   ○
```

### Specs — Page architecture decision
- `/dashboard` → current day's status.
- `/tracker` → full weekly view.

### Tasks
- [x] Create the `/tracker` page
- [x] Implement completions query for the current week (using `GET /completions`)
- [x] Implement the habits × days-of-week table
- [x] Allow marking/unmarking directly in the table (reusing `PUT`/`DELETE /completions/:date`)
- [x] Implement navigation between weeks (previous/next)
- [x] Handle empty states and habits created mid-week
- [x] Test the full flow: mark past days, navigate between weeks, confirm persistence

### Completion criteria
The user can view and edit the completion state of all habits across a week, with navigation between weeks.

---

## Phase 9 — Basic Statistics

### Objective
Introduce metrics derived from the completion history, now that real history exists.

### Specs — Metrics to implement

**Completion rate**
```text
completions / expected completions
```
Example for a daily habit: `5 completions / 7 days = 71.4%`

**Current streak** — number of consecutive days up to today.

**Best streak** — longest historical streak.

**Weekly comparison**
```text
This week: 82%
Last week: 71%
Trend: +11%
```

**Pillar statistics**
```text
Health          85%
Engineering     92%
Knowledge       64%
Relationships   78%
```

### Tasks
- [x] Implement statistics endpoint(s) (e.g., `GET /stats/habits/:id`, `GET /stats/pillars`, `GET /stats/overview`)
- [x] Implement completion rate calculation per habit
- [x] Implement current streak calculation
- [x] Implement best streak calculation
- [x] Implement weekly comparison (current week vs. previous week)
- [x] Implement statistics aggregation by pillar
- [x] Write unit tests for each calculation (edge cases: no history, broken streak, etc.)
- [x] Create a statistics section/page in the frontend
- [x] Display completion rate, streaks, and weekly comparison per habit
- [x] Display aggregated statistics per pillar

### Completion criteria
Statistics are calculated correctly from `HabitCompletion` data (with no additional tables for derived values) and are visible in the interface.

---

## Phase 10 — Heatmap

### Objective
Annual/monthly visualization of completion intensity, in the style of a "contribution graph".

### Specs — Layout

```text
2026

Jan   ░░███░░██░░
Feb   ███░░████░░
Mar   ░██████░░░░
```

### Specs — Intensity rule
```text
0 habits completed = 0
1 habit            = low intensity
2 habits           = medium
3+ habits          = high
```

### Specs — Architecture rule
Data is **derived** from `HabitCompletion`. Do not create a `DailyProgress` table just to store a calculation — tables represent domain entities, not derived calculations.

### Tasks
- [ ] Implement an endpoint that aggregates completions per day (e.g., `GET /stats/heatmap?year=2026`)
- [ ] Implement intensity classification logic (0/low/medium/high)
- [ ] Create the heatmap component in the frontend (monthly and/or yearly)
- [ ] Implement tooltip/detail on hover for a given day
- [ ] Test with sparse data and months with no completions at all
- [ ] Validate the performance of the aggregation query with a larger history

### Completion criteria
The heatmap correctly reflects the intensity of completed habits per day, calculated from existing data, without new derived-storage tables.

---

## Phase 11 — UX Improvements

### Objective
Refine the experience **after** the product has been used for a few days, based on real usage observation.

### Specs — Process
Before implementing improvements, observe:
- Which actions are slow.
- Which information is not useful.
- Where there are too many clicks.
- Which habits don't make sense.
- Which statistics are actually consulted.

### Specs — Improvement candidates (do not implement before using the product)
- Drag-and-drop
- Reordering habits
- Keyboard shortcuts
- Refined dark mode
- Animations
- Optimistic updates
- Better loading states
- More elaborate empty states

### Tasks
- [ ] Use the application daily for at least 1–2 weeks before starting this phase
- [ ] Document real friction points observed (concrete list of issues)
- [ ] Prioritize improvements by impact vs. effort
- [ ] Implement prioritized UX improvements (one at a time, with validation)
- [ ] Reassess after each change whether the friction was resolved

### Completion criteria
Each implemented improvement corresponds to a real observed friction, not a speculative optimization of an experience that hasn't been tested yet.

---

## Phase 12 — Security and Robustness

### Objective
Prepare the application to handle real data and real users before deployment.

### Specs — Backend

- Validation of all inputs with Zod.
- Rate limiting on login.
- CORS correctly configured for production.
- Security headers (e.g., Helmet or equivalent).
- Consistent error handling (uniform error response format).
- Never expose `passwordHash`.
- All queries filtered by the authenticated `userId`.

### Specs — Critical user isolation rule

Wrong:
```ts
prisma.habit.findUnique({
  where: { id: habitId }
});
```

Correct:
```ts
prisma.habit.findFirst({
  where: {
    id: habitId,
    userId: authenticatedUserId,
  },
});
```

Isolation between users must be treated as a fundamental security rule, not an implementation detail.

### Tasks
- [ ] Review all endpoints and ensure Zod validation on every input
- [ ] Implement rate limiting on the login endpoint
- [ ] Configure production CORS (specific origins, not wildcard)
- [ ] Configure security headers (Helmet or equivalent)
- [ ] Standardize the error response format across the entire API
- [ ] Audit all API responses to ensure `passwordHash` is never exposed
- [ ] Audit **all** Prisma queries to confirm filtering by authenticated `userId` (Pillars, Habits, Completions)
- [ ] Write specific user isolation tests (user A cannot access user B's data)
- [ ] Review error handling on the frontend (clear messages, no internal detail leakage)

### Completion criteria
Security audit completed, with automated tests confirming user isolation and no exposure of sensitive data.

---

## Phase 13 — CI

### Objective
Ensure all code that reaches `main` is buildable, tested, and lint-clean.

### Specs — Pipeline

```text
Pull Request
     ├── pnpm install --frozen-lockfile
     ├── pnpm lint
     ├── pnpm test
     └── pnpm build
```

### Specs — Workflow (GitHub Actions, conceptual example)

```yaml
name: CI

on:
  pull_request:
  push:
    branches:
      - main

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 10
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm test
      - run: pnpm build
```

### Tasks
- [ ] Create the workflow file at `.github/workflows/ci.yml`
- [ ] Configure trigger on pull requests and push to `main`
- [ ] Configure pnpm cache to speed up builds
- [ ] Ensure `pnpm lint` covers `apps/api`, `apps/web`, and `packages/shared`
- [ ] Ensure `pnpm test` runs all tests (backend and frontend)
- [ ] Ensure `pnpm build` fails the pipeline on error
- [ ] Configure branch protection on `main` to require a green CI before merge
- [ ] Validate the pipeline with a test PR

### Completion criteria
No code reaches `main` without passing through automated lint, tests, and build.

---

## Phase 14 — Deployment

### Objective
Put the application into production, with frontend, backend, and database correctly separated and configured.

### Specs — Production architecture

```text
┌──────────────┐
│    Browser   │
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ React Web    │  → Static hosting / web platform
└──────┬───────┘
       │ HTTPS
       ▼
┌──────────────┐
│ Fastify API  │  → Node.js server
└──────┬───────┘
       │
       ▼
┌──────────────┐
│ PostgreSQL   │  → Managed PostgreSQL
└──────────────┘
```

### Specs — Pre-deploy checklist
- Environment variables configured.
- `DATABASE_URL` configured for the production environment.
- API domain configured.
- Production CORS configured (exact frontend origin).
- Migrations executed in production.
- HTTPS configured (valid certificate).
- Authentication cookies validated in production (Secure, SameSite, correct domain).
- Logs configured (minimum level of observability).

### Tasks
- [ ] Choose a hosting platform for the frontend (static hosting)
- [ ] Choose a hosting platform for the backend (Node.js server)
- [ ] Choose a managed PostgreSQL provider
- [ ] Configure environment variables for each environment (staging/production)
- [ ] Configure production `DATABASE_URL`
- [ ] Configure the API domain/subdomain
- [ ] Configure production CORS (exact origin, no wildcard)
- [ ] Run migrations in production
- [ ] Configure HTTPS/certificates
- [ ] Validate authentication cookies in the production environment (Secure, SameSite=Strict/Lax, correct domain)
- [ ] Configure basic logging (errors and access)
- [ ] Deploy the backend
- [ ] Deploy the frontend
- [ ] Test the full flow in production: register → login → create pillar → create habit → mark completion → view dashboard
- [ ] Configure database backups (even if basic)

### Completion criteria
The application is publicly accessible via HTTPS, with all main flows validated in production and minimal database backups configured.

---

## MVP "Done" Definition

The MVP is finished when a user can:

1. Open the application.
2. Create an account.
3. Log in.
4. Create their pillars.
5. Create habits.
6. Associate habits with pillars.
7. Mark habits as completed.
8. Unmark habits.
9. View the week (Weekly Tracker).
10. View progress (Dashboard).
11. Check basic statistics.
12. Use the application in production.

### Final MVP composition

```text
Authentication
      +
Pillars
      +
Habits
      +
Daily Completions
      +
Dashboard
      +
Weekly Tracker
      +
Basic Analytics
      +
Deployment
```

### Deliberately out of scope for the MVP

```text
Projects
XP
Levels
Achievements
Journal
Mood
AI
Notifications
Social
Mobile App
```

These modules should only be considered after the core product proves its value in real use.

---

## Milestones Summary

```text
M1  — Foundation                    [DONE]
M2  — Authentication                [DONE]
M3  — Pillars                       [DONE]
M4  — Habits                        [DONE]    
M5  — Habit Completions             [DONE]
M6  — Dashboard                     [DONE]
M7  — Weekly Tracker
M8  — Basic Analytics
M9  — Security & Quality
M10 — CI
M11 — Deployment
M12 — MVP Release
```
