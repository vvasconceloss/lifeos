# LifeOS

> LifeOS is a system for observing and intentionally improving your life.

A habit-tracking web app built with **Node.js**, **TypeScript**, **React** and **PostgreSQL**.
This project is intentionally scoped as an MVP. Its purpose is not to build a full life-management platform, but to establish a solid full-stack foundation — auth, data modeling, testing discipline — before increasing complexity.

---

# Features

- User accounts with authentication
- Create, complete and remove habits
- Weekly grid view per habit (7-day checklist)
- Streak calculation
- Weekly progress percentage
- Dashboard with raw statistics (no AI involved — all analysis is deterministic)

---

# Tech Stack

- Node.js + TypeScript + Fastify (API)
- React + TypeScript + Vite (Web)
- PostgreSQL + Prisma (data layer)
- Zod (shared validation between API and Web)
- pnpm workspaces (monorepo)

The objective is to master the fundamentals of a real full-stack app before adding anything beyond that.

---

# Project Structure

```
lifeos/
│
├── apps/
│   ├── api/
│   │   ├── src/
│   │   │   ├── routes/
│   │   │   ├── services/
│   │   │   └── prisma/
│   │   └── package.json
│   │
│   └── web/
│       ├── src/
│       │   ├── components/
│       │   └── pages/
│       └── package.json
│
├── packages/
│   └── shared/
│       └── src/schemas/
│
├── pnpm-workspace.yaml
├── tsconfig.base.json
└── README.md
```

The project is divided into small, isolated responsibilities to encourage clean architecture from the beginning.

---

# Architecture

```
Web (React)
   │
   ▼
API (Fastify)
   │
   ▼
Service layer
   │
   ▼
Prisma
   │
   ▼
PostgreSQL
```

Responsibilities:
- **Web** renders the UI and calls the API.
- **API** exposes routes and validates input.
- **Services** contain the business logic (streaks, progress, etc.).
- **Prisma** handles persistence.
- **Shared schemas** (Zod) keep the API contract identical on both ends.

---

# Getting Started

## Clone the repository

```bash
git clone https://github.com/vvasconceloss/lifeos.git
cd lifeos
```

## Install dependencies

```bash
pnpm install
```

## Run the project

```bash
pnpm dev
```

---

# Testing

```bash
# backend
pnpm --filter @lifeos/api test
```

---

# Requirements

- Node.js 20+
- pnpm
- PostgreSQL

---

# License

This project is licensed under the MIT License.
Feel free to use, modify, and learn from the code.

---

# Author

**Victor Vasconcelos**
