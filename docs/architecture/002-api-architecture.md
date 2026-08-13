# ADR 002 — API Architecture (Fastify + Feature Modules)

- **Status:** Accepted
- **Date:** 2026

## Context

The backend serves a personal life-management product: habits, goals, projects, daily logs,
statistics and gamification. It needs to be fast to extend, easy to test, and resilient (JSON
logging, health checks, graceful shutdown).

## Problem

Choose a framework and module structure that keeps ~10 feature domains organized, validated, and
independently testable.

## Decision

Use **Fastify** with a per-feature module convention:

```
apps/api/src/modules/<feature>/
├── <feature>.routes.ts    # HTTP handlers
├── <feature>.schemas.ts   # re-exports shared Zod schemas/types
├── <feature>.service.ts   # orchestration + userId-scoped persistence
├── <feature>.test.ts      # contract/integration tests
└── (optional) .lib.ts / .utils.ts   # pure domain logic
```

Plus global plugins (`auth`, `cors`, `csrf`, `helmet`, `rate-limit`, `error-handler`, `openapi`)
and pure `lib/` modules (`frequency.ts`, `errors.ts`, `validation.ts`).

Every route validates input through `validateInput` (shared Zod) and returns the standardized
error contract (`{ error: { code, message } }`, Phase 2). Services return
`{ resource } | { error, status }`, so routes stay thin and authorization lives in the service
(`findFirst({ where: { id, userId } })`).

## Alternatives considered

- **Express** — rejected: less built-in schema/validation support; would need more glue.
- **NestJS** — rejected: heavier framework than needed for this scope.
- **Flat routes/controllers** — rejected: features would mix; the module convention keeps
  boundaries explicit.

## Trade-offs

- Fastify's plugin system has a learning curve and some plugins (e.g. `@fastify/swagger-ui`) are
  picky about prefixes.
- Convention is enforced by discipline, not a framework — kept honest by the module-convention
  audit (Phase 6) and contract tests.

## Consequences

- New features are added as new modules following the same shape.
- Domain logic is pure and unit-tested without HTTP (see ADR 004 and `lib/frequency.ts`).
- Health checks (`/v1/health`, `/v1/health/ready`), structured pino logs and graceful shutdown
  are part of the API core.
