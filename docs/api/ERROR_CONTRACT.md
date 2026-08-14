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
| 400 | Invalid or expired verification link | `INVALID_VERIFICATION_TOKEN` |
| 400 | Expired verification link | `VERIFICATION_EXPIRED` |
| 400 | Invalid or expired password-reset link | `INVALID_RESET_TOKEN` |
| 400 | Expired password-reset link | `RESET_EXPIRED` |
| 400 | Wrong current password / same new password | `INCORRECT_PASSWORD` · `SAME_PASSWORD` |
| 400 | Invalid or expired email-change link | `EMAIL_CHANGE_EXPIRED` · `INVALID_EMAIL_CHANGE_TOKEN` |
| 400 | Domain rule violation (future date, pillar mismatch, invalid onboarding pillar) | `FUTURE_DATE` · `HABIT_PILLAR_MISMATCH` · `INVALID_PILLAR_INDEX` |
| 401 | Unauthenticated / expired session | `UNAUTHORIZED` |
| 401 | Invalid credentials | `INVALID_CREDENTIALS` |
| 403 | Action requires a verified email | `EMAIL_NOT_VERIFIED` |
| 403 | Account is in the deletion grace period | `ACCOUNT_PENDING_DELETION` |
| 404 | Resource not found (incl. cross-user access, which is indistinguishable) | `*_NOT_FOUND` |
| 409 | Conflict (duplicate email, already onboarded, pillar with habits, deletion already requested) | `EMAIL_ALREADY_EXISTS` · `ALREADY_ONBOARDED` · `PILLAR_HAS_HABITS` · `ALREADY_PENDING_DELETION` |
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
| `EMAIL_NOT_VERIFIED` | Please verify your email to continue |
| `VERIFICATION_EXPIRED` | Verification link has expired |
| `INVALID_VERIFICATION_TOKEN` | Invalid or expired verification link |
| `INVALID_RESET_TOKEN` | Invalid or expired reset link |
| `RESET_EXPIRED` | Reset link has expired |
| `INCORRECT_PASSWORD` | Current password is incorrect |
| `SAME_PASSWORD` | New password must be different from the current one |
| `NEW_EMAIL_SAME` | New email must be different from the current one |
| `EMAIL_CHANGE_EXPIRED` | Confirmation link has expired |
| `INVALID_EMAIL_CHANGE_TOKEN` | Invalid or used confirmation link |
| `ALREADY_PENDING_DELETION` | Account deletion has already been requested |
| `ACCOUNT_PENDING_DELETION` | This account is scheduled for deletion. Please recover it first. |
| `RECOVERY_EXPIRED` | Recovery link has expired |
| `INVALID_RECOVERY_TOKEN` | Invalid or used recovery link |
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
