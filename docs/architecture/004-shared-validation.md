# ADR 004 — Shared Validation (Zod at every boundary)

- **Status:** Accepted
- **Date:** 2026

## Context

Request bodies, params and query strings arrive as untrusted JSON. The API and the web app must
agree on the same shapes (habits, frequencies, goals, projects, errors…). Duplicating schemas in
two codebases would drift.

## Problem

Ensure every external input is validated at the HTTP boundary, with one source of truth shared by
API and web.

## Decision

- All request schemas live in **`packages/shared/src/schemas`** (Zod) and are consumed by both
  apps.
- The API validates every body/params/query through `validateInput` (`apps/api/src/lib/validation.ts`),
  which sends `400 { error: { code: "VALIDATION_ERROR", message: "Validation failed", details } }`
  on failure. Unknown keys are stripped by Zod — no mass assignment.
- The web uses the same schemas in `validateForm` for client-side validation, so error messages
  match the backend.
- Frequencies carry conditional validation (e.g. `WEEKLY_DAYS` requires `daysOfWeek`).

## Alternatives considered

- **JSON Schema only** — rejected: Zod's type inference gives TS types for free.
- **Duplicate schemas per app** — rejected: drift risk; Phase 6 confirmed shared types as the
  single source.

## Trade-offs

- The shared package is consumed as TS source, so both build pipelines must compile it
  (configured in Vite/Vitest/tsup).
- Custom refinement logic (frequency params) lives in shared too, which the web must keep in sync
  — verified by contract tests.

## Consequences

- Validation failures are uniform across the API (covered by the error contract, Phase 2).
- A schema change is a single commit affecting both apps atomically (ADR 001).
