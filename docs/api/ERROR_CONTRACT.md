# LifeOS — API Error Contract

> Every endpoint responds with the same error shape.

## Shape

All errors — validation, authorization, not-found, conflicts, rate limits and internal errors —
are returned as:

```json
{
  "error": {
    "code": "HABIT_NOT_FOUND",
    "message": "Habit not found"
  }
}
```

Optional field `details` is present when extra context is useful (e.g. validation issues):

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [{ "path": ["name"], "message": "Required" }]
  }
}
```

The type is shared between API and Web as `ApiErrorBody` / `ApiErrorResponse`
(`packages/shared/src/schemas/common.ts`). The API builds the body with
`toErrorBody(message, details?, code?)` (`apps/api/src/lib/errors.ts`), which derives the `code`
from the message via a central map (default `APP_ERROR`).

## Status → code mapping

| HTTP status | Meaning | Code |
|---|---|---|
| 400 | Validation error | `VALIDATION_ERROR` |
| 400 | Domain rule violation (future date, pillar mismatch, invalid onboarding pillar) | `FUTURE_DATE` · `HABIT_PILLAR_MISMATCH` · `INVALID_PILLAR_INDEX` |
| 401 | Unauthenticated / expired session | `UNAUTHORIZED` |
| 401 | Invalid credentials | `INVALID_CREDENTIALS` |
| 404 | Resource not found (incl. cross-user access, which is indistinguishable) | `*_NOT_FOUND` |
| 409 | Conflict (duplicate email, already onboarded, pillar with habits) | `EMAIL_ALREADY_EXISTS` · `ALREADY_ONBOARDED` · `PILLAR_HAS_HABITS` |
| 429 | Rate limited | `RATE_LIMIT_EXCEEDED` |
| 500 | Internal error (no internal details leaked) | `INTERNAL_ERROR` |

## Codes

| Code | Message |
|---|---|
| `UNAUTHORIZED` | Unauthorized |
| `VALIDATION_ERROR` | Validation failed |
| `INTERNAL_ERROR` | Internal Server Error |
| `NOT_FOUND` | Not Found |
| `EMAIL_ALREADY_EXISTS` | Email already in use |
| `INVALID_CREDENTIALS` | Invalid email or password |
| `USER_NOT_FOUND` | User not found |
| `ALREADY_ONBOARDED` | User already completed onboarding |
| `INVALID_PILLAR_INDEX` | A habit references a pillar that was not selected |
| `PILLAR_HAS_HABITS` | Cannot delete pillar with associated habits… |
| `PILLAR_NOT_FOUND` | Pillar not found |
| `HABIT_NOT_FOUND` | Habit not found |
| `HABIT_PILLAR_MISMATCH` | Habit must belong to the goal's pillar |
| `FUTURE_DATE` | Cannot mark/log future dates |
| `COMPLETION_NOT_FOUND` | Completion not found |
| `GOAL_NOT_FOUND` | Goal not found |
| `PROJECT_NOT_FOUND` | Project not found |
| `TASK_NOT_FOUND` | Task not found |
| `DAILY_LOG_NOT_FOUND` | Daily log not found |
| `RATE_LIMIT_EXCEEDED` | Rate limit exceeded, retry in … |
| `APP_ERROR` | Fallback for any unlisted message |

## Cross-cutting behavior

- **Validation** is centralized in `validateInput` (`apps/api/src/lib/validation.ts`): a failed Zod
  parse returns `400` with `VALIDATION_ERROR` and the Zod issues in `details`.
- **Password validation** (registration, and any future reset/change endpoint) follows the strong
  policy defined in `packages/shared/src/schemas/password.ts`. Each violation is reported as an
  individual Zod issue under `details[].message`:
  - `Password must be at least 8 characters`
  - `Password must be at most 72 bytes`
  - `Password must include at least one lowercase letter`
  - `Password must include at least one uppercase letter`
  - `Password must include at least one number`
  - `Password must include at least one special character`
  - `Password is too common. Choose a more unique password.`
  - `Password must not be the same as your email`
- **Not-found vs. forbidden:** cross-user access to another user's resource returns `404` (with the
  entity's `*_NOT_FOUND` code) — it is deliberately indistinguishable from "does not exist".
- **5xx** never leak stack traces, SQL or internal state — the global handler returns a generic
  `INTERNAL_ERROR`.
- **Rate limit** errors are thrown as `ApiError` (`RATE_LIMIT_EXCEEDED`) and rendered by the global
  handler, so all endpoints share the same shape.

---

_More docs: [Documentation index](../README.md) · [Domain rules](../domain/DOMAIN_RULES.md) · [LifeOS README](../../README.md)_
