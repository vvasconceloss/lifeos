# ADR 001 — Monorepo with pnpm Workspaces

- **Status:** Accepted
- **Date:** 2026

## Context

LifeOS has three closely-coupled code units: an API (Node/Fastify), a web app (React/Vite) and a
shared contract (Zod schemas + types). They must evolve together — a schema change touches all
three. A single repository with separate published packages would force version bumps and
synchronization overhead for every small change.

## Problem

How to organize the three units so that shared types/schemas are the single source of truth
without the overhead of publishing separate packages.

## Decision

Use a **single repository** with **pnpm workspaces**:

```
apps/api        # Fastify API
apps/web        # React + Vite SPA
packages/shared # shared Zod schemas + response types
```

Workspace packages are referenced by `workspace:*` and consumed as TypeScript source (no build
step for `@lifeos/shared`). One lockfile, one `pnpm install`, atomic cross-package changes.

## Alternatives considered

- **Separate repos / published packages** — rejected: publishing `@lifeos/shared` adds release
  friction and version drift for a personal project.
- **npm/yarn workspaces** — rejected: pnpm's strict node_modules + `pnpm-workspace.yaml`
  overrides (for patched transitive deps) fit the audit-clean requirement.

## Trade-offs

- One lockfile means any dependency change re-resolves everything (slower installs, but cached).
- `packages/shared` is consumed from source, so tooling (Vite/Vitest/tsup) must compile it — all
  already configured to do so.

## Consequences

- Cross-cutting changes (e.g. the error contract, Phase 2) are a single commit across all units.
- CI installs once (`pnpm install --frozen-lockfile`) and runs lint/test/build for the whole repo.
