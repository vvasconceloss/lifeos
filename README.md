# LifeOS

> LifeOS is a system for observing and intentionally improving your life.

A habit-tracking web app built with **Node.js**, **TypeScript**, **React** and **PostgreSQL**.

The v1.0 MVP is complete and deployed. Development continues toward **v1.5 (Public Beta / intermediate product)** — see [`docs/1.5_PLAN.md`](docs/1.5_PLAN.md) for the roadmap and [`docs/DOMAIN_RULES.md`](docs/DOMAIN_RULES.md) for the data model and business rules.

---

## Features

- User accounts with authentication
- Pillars to organize life areas
- Habit CRUD with monthly goals and archiving
- Mark/unmark habits as completed per day (idempotent, unique per day)
- Monthly dashboard grid with inline completion toggling and progress
- Statistics: completion rate, streaks and pillar aggregation
- Annual activity heatmap (GitHub-style)

---

## Tech Stack

- Node.js + TypeScript + Fastify (API)
- React + TypeScript + Vite (Web)
- PostgreSQL + Prisma (data layer)
- Zod (shared validation between API and Web)
- pnpm workspaces (monorepo)

---

## Project Structure

```
lifeos/
│
├── apps/
│   ├── api/            # Fastify API (modules: auth, pillars, habits, completions, stats)
│   │   ├── src/
│   │   ├── prisma/     # schema + migrations
│   │   └── Dockerfile  # via root Dockerfile
│   └── web/            # React + Vite SPA
│       └── vercel.json # /v1 proxy + SPA fallback
│
├── packages/
│   └── shared/         # shared zod schemas and types
│
├── .github/workflows/  # CI + keep-alive
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

---

## Getting Started (development)

### Requirements

- Node.js 22+
- pnpm
- PostgreSQL (or Docker)

### Setup

```bash
git clone https://github.com/vvasconceloss/lifeos.git
cd lifeos
pnpm install
```

Start PostgreSQL (Docker):

```bash
docker compose up -d
```

Prepare the database and generate the Prisma client:

```bash
cp apps/api/.env.example apps/api/.env   # set DATABASE_URL and JWT_SECRET
pnpm db:migrate                          # applies migrations
pnpm prisma:generate
```

Run the API (port 3000) and the web app (port 5173) in two terminals:

```bash
pnpm --filter @lifeos/api dev
pnpm --filter @lifeos/web dev
```

---

## Testing, Lint and Build

```bash
pnpm lint     # eslint across api, web and shared
pnpm test     # API tests (requires a running PostgreSQL)
pnpm build    # typecheck/build api and web
```

---

## CI

`.github/workflows/ci.yml` runs install, Prisma generate + migrations, lint, tests and build on every pull request and push to `main`, using a Postgres service container.

---

## Deployment

Production architecture:

```
Browser → https://<app-domain>/v1/*  →  (rewrite)  →  https://<api-domain>/v1/*
            https://<app-domain>/*   →  SPA index.html
API (Docker) → managed PostgreSQL
```

The frontend calls the API through a **same-origin `/v1` rewrite** on the static host, so cookies remain same-site (`SameSite=Strict`, `Secure`) with no CORS or cross-site cookie handling.

### 1. PostgreSQL — Neon (free)

1. Create a project at neon.tech and copy the connection string as `DATABASE_URL`.
2. Apply migrations once:
   ```bash
   DATABASE_URL="postgresql://..." pnpm db:migrate
   ```
3. Backups: Neon free tier provides point-in-time restore.

### 2. API — Render (free web service)

1. Create a new **Web Service** pointing at the repository.
2. **Docker** deploy (the root `Dockerfile` handles install, Prisma generate and start).
3. Environment variables:
   | Variable | Value |
   |---|---|
   | `DATABASE_URL` | Neon connection string |
   | `JWT_SECRET` | long random secret (`openssl rand -hex 32`) |
   | `ALLOWED_ORIGINS` | `https://<app-domain>` |
   | `NODE_ENV` | `production` |
   | `PORT` | auto-injected by Render |
4. The container applies migrations (`prisma migrate deploy`) on start.
5. Keep the free instance awake (it sleeps after ~15 min of inactivity) with `.github/workflows/keep-alive.yml`, which pings `/v1/health` every 10 minutes.

### 3. Frontend — Vercel (free)

1. Import the repository; set **Root Directory** to `apps/web` (framework preset: Vite).
2. Build command: `pnpm build`; Output directory: `dist`.
3. **Install command** — pin the pnpm version for consistency:
   ```
   npm install -g pnpm@11.3.0 && pnpm install --frozen-lockfile
   ```
4. The `vercel.json` rewrites `/v1/*` to the API domain and falls back to `index.html` for client-side routes.
5. Update the API domain in `apps/web/vercel.json` (currently `https://lifeos-i59v.onrender.com`) if it differs.

### Production verification checklist

- Register → login → create pillar → create habit → mark a completion
- Dashboard, statistics and heatmap render with real data
- Cookie is `HttpOnly`, `Secure`, `SameSite=Strict` over HTTPS
- Migrations applied; database backups confirmed

---

## License

This project is licensed under the MIT License.
