# LifeOS — Security Audit & Data Isolation

> Result of the **Phase 1 — Security Audit and Isolation** pass
> (see [`docs/roadmap/IMPROVE_ROADMAP.md`](roadmap/IMPROVE_ROADMAP.md)).
> Status: **audited and verified by tests**.

## Checklist

| Area | Status | How it's guaranteed |
|---|---|---|
| Authentication | ✅ | Email + bcrypt password; JWT in `HttpOnly` cookie; **session expiry enforced (30 days)** |
| Authorization | ✅ | `requireAuth` (`jwtVerify`) on every protected route; all queries scoped by `userId` |
| IDOR / data isolation | ✅ | Cross-user access to every entity returns `404` — verified by per-entity tests (below) |
| CSRF | ✅ | `@fastify/csrf-protection` on all state-changing requests (`csrf-token` header + signed cookie) |
| XSS | ✅ | All user input rendered as text by React (no `dangerouslySetInnerHTML`); icon/description fields escaped |
| SQL injection | ✅ | Prisma parameterized queries only; no raw user-input SQL (`$queryRaw` used solely for a constant `SELECT 1` health check) |
| CORS | ✅ | Explicit origin allow-list (`ALLOWED_ORIGINS`), wildcard rejected, credentials allowed |
| Rate limiting | ✅ | Global (300/min) + login (5/min) + register (10/min) |
| Password policy | ✅ | **Strong policy** (shared Zod schema): 8–72 bytes, ≥1 lowercase, ≥1 uppercase, ≥1 number, ≥1 special char, not among the 1000 most common passwords, not equal to the email |
| Cookie configuration | ✅ | `HttpOnly`, `SameSite=Strict`, `Secure` in production, `Max-Age` 30 days |
| Session / JWT expiry | ✅ | Tokens signed with a 30-day `exp`; expired tokens rejected with `401` (tested) |
| Secrets | ✅ | `.env` git-ignored; secrets never in code. Exception: the **public demo account** (`demo@lifeos.com`) credentials are intentionally committed — they are not real secrets |
| Error leakage | ✅ | 5xx → generic `Internal Server Error`; validation errors return only field issues; no stack traces / queries leaked |
| Input validation / mass assignment | ✅ | Zod at every boundary via `validateInput`; unknown body keys are stripped (no mass assignment) |
| Dependency vulnerabilities | ✅ | `pnpm audit --prod` → no known vulnerabilities; patched transitive versions pinned via `pnpm-workspace.yaml` `overrides` |

## Details

### Authentication & sessions

- Passwords hashed with `bcrypt` (10 rounds); plaintext never stored or returned.
- JWT (`@fastify/jwt`) is set as an `HttpOnly`, `SameSite=Strict` cookie (`Secure` in production) —
  never exposed to `localStorage`, which is XSS-safe by design.
- **Session expiry:** every token is now signed with `expiresIn: 30d` and the cookie `Max-Age` is
  set to the same 30 days. `requireAuth` calls `jwtVerify()`, so an expired token returns `401`
  (covered by `auth.test.ts` → "rejects an expired token").
- Login/register are rate-limited (5/min and 10/min respectively) to slow brute force.

### Authorization & IDOR

The rule: **User B must never read or mutate User A's data, even with a valid guess of the ID.**
Every service resolves the resource with `findFirst({ where: { id, userId } })`, so a cross-user
lookup is indistinguishable from "not found" (returns `404`).

Isolation test coverage (all: User A creates → User B `GET`/`PATCH`/`DELETE`/sub-actions → `404`):

| Entity | Test |
|---|---|
| Habits | `habit.test.ts` → "prevents another user from reading or mutating a habit" (GET/PATCH/archive/DELETE) |
| Completions | `completion.test.ts` → mark/unmark another user's habit (404) + list isolation |
| Pillars | `pillar.test.ts` → list no-leak + PATCH/DELETE another user's pillar (404) |
| Goals | `goal.test.ts` → "prevents another user from reading or mutating a goal" + habit association |
| Projects & tasks | `project.test.ts` → project GET/PATCH/DELETE + adding a task to another user's project |
| Daily logs | `daily-log.test.ts` → GET/PATCH/DELETE another user's log |
| Stats / analytics / progression | cross-user queries return empty or `404` |

### CSRF & CORS

- CSRF protection is registered globally (`csrfPlugin`) — every `POST/PUT/PATCH/DELETE` requires a
  valid `csrf-token` header matching the signed `_csrf` cookie. Tests build the app with
  `csrf: false` to exercise the API directly; the production app keeps it enabled.
- CORS only allows origins listed in `ALLOWED_ORIGINS` (no wildcard) and sends `credentials: true`
  — and the web normally talks to the API same-origin through a `/v1` rewrite, so cookies are
  `SameSite=Strict`-safe.

### Error handling

The global error handler maps validation failures to `400` with field details and every other
`5xx` to a generic message. It never echoes stack traces, SQL, or internal state.

### Secrets

- `apps/api/.env` is git-ignored (only `.env.example` is committed, with placeholders).
- The only committed credential is the **intentional public demo account**
  (`demo@lifeos.com` / `demo-lifeos-2026`), seeded on boot — it is a public sample, not a real
  secret.

---

_More docs: [Documentation index](README.md) · [Improve roadmap](roadmap/IMPROVE_ROADMAP.md) · [LifeOS README](../README.md)_
