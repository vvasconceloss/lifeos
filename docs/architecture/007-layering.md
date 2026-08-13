# LifeOS — Layering, Module Convention & Code Quality

> Result of **Phase 6 — Code Quality and Boundaries**
> (see [`docs/roadmap/IMPROVE_ROADMAP.md`](../roadmap/IMPROVE_ROADMAP.md)).

## The 5-layer boundary

```
HTTP            routes — Fastify handlers, params/query/body in, HTTP status out
   ↓
Validation      Zod schemas (`packages/shared`), enforced via `validateInput`
   ↓
Service         `*.service.ts` — orchestration, authorization (`userId` scoping)
   ↓
Domain          pure logic — `lib/frequency.ts`, `stats.utils.ts`, `progression.lib.ts`
   ↓
Persistence     Prisma (`db/client.ts`, `prisma/schema.prisma`)
```

Rule: **domain logic never depends on Fastify, HTTP or React.** "How is a completion rate
calculated?" is answered entirely by `lib/frequency.ts` (`expectedCompletions`, `completionRate`,
`getCurrentStreakForFrequency`), which is pure and unit-tested with tables (`domain-rules.test.ts`).
Services call it with dates and keys; routes only translate requests → service calls → responses.

## Module convention

Every feature under `apps/api/src/modules/<feature>/` follows:

```text
module/
├── <feature>.routes.ts    # Fastify handlers + validation
├── <feature>.schemas.ts   # re-exports shared Zod schemas/types
├── <feature>.service.ts   # orchestration + persistence
├── <feature>.test.ts      # contract/integration tests
└── (optional) .lib.ts / .utils.ts / .types.ts
```

All modules conform (auth also carries `demo.service.ts` + `onboarding.service.ts`; stats has
`stats.utils.ts`; progression has `progression.lib.ts` — all within the convention). There are no
unjustified exceptions.

## TypeScript sweep (Phase 6)

### `any`

**0 occurrences** in source (only `expect.any(Number)` in tests). No `Record<string, any>`.

### `as` casts — inventory and justification

| Location | Cast | Justification |
|---|---|---|
| `openapi.ts` document → plugin | `as never` | Static config boundary; the literal is a valid OpenAPI 3.0 doc but the plugin's exact `OpenAPIV3.Document` type can't be satisfied inline. Documented decision. |
| `jwt.ts`, `cookie.ts` | `as FastifyJWTOptions` / `FastifyCookieOptions` | Plugin option typing at the framework boundary. |
| services (`goal`, `project`, `stats`, `progression`, `habit`) | `frequency as HabitFrequency`, `status as Status`, `status as never` | Prisma enums / dynamic update values vs. the shared string-union types. The stored value IS the enum; the cast is a boundary cast, not a lie. |
| `habitInput(habit as …)` | Prisma row → input shape | Runtime shape matches; avoids widening the query type. |
| `auth.routes.ts` | `sameSite: 'strict' as const` | Literal type assertion (type-safe). |
| constants | `as const` | Literal type assertion (type-safe). |

### Non-null assertions (`!`) — inventory and justification

**2 remaining** (after removing 14 in `demo.service.ts` and 1 in `habit-detail.tsx`):

| Location | Why it is safe |
|---|---|
| `stats.service.ts` `months[0]!.start` | `months` is built by a fixed 6-iteration loop, so index 0 always exists. |
| `onboarding.service.ts` `pillars[h.pillarIndex]!.id` | Guarded earlier by `data.habits.some(h => h.pillarIndex >= data.pillars.length)` → 400. |

### Duplicated types

- Backend/shared types live in `packages/shared` (`UserResponse`, `HabitResponse`, `GoalResponse`,
  `ProjectResponse`, …) and are the single source for API contracts.
- The frontend re-declares the *wire shape* (dates as `string`, since JSON serializes `Date`).
  This is a deliberate, documented exception: shared types use `Date` for server-side logic; the
  frontend types model the JSON payload. They are kept in sync manually and covered by contract
  tests.

### Broad types

`Record<string, …>` appears only for dictionaries/error maps/payloads (e.g. `MESSAGE_TO_CODE`,
API payloads). No `Record<string, any>`; no `object`-typed function parameters.

## Complexity review

- **Largest non-test file:** `apps/api/src/openapi.ts` (~880 lines) — a declarative data document,
  not logic.
- **Largest service:** `stats.service.ts` (~570 lines) — cohesive aggregation functions
  (`getOverview`, `getAnalytics`, …), each independently unit/contract-tested; the heavy analytics
  math lives in `lib/`/`stats.utils.ts`, keeping domain logic testable without HTTP.
- **Largest React page:** `project-detail.tsx` / `journal.tsx` — split into subcomponents
  (`TaskRow`, `JournalDayCard`, …) rather than one monolithic component.
- No service mixes unrelated domains; hooks stay thin (auth/theme/dashboard data) and domain rules
  are not embedded in UI components.

---

_More docs: [Documentation index](../README.md) · [Domain rules](../domain/DOMAIN_RULES.md) · [LifeOS README](../../README.md)_
