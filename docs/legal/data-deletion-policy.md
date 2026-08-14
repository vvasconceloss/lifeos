# LifeOS — Data Deletion Policy

> Result of **Phase 6 — Account Soft-Delete** (see [`docs/roadmap/1.6_ROADMAP.md`](../roadmap/1.6_ROADMAP.md)).

## How account deletion works

1. A verified user requests deletion from their profile, confirming their current password.
2. The account enters a **15-day grace period** (`status = PENDING_DELETION`):
   - A confirmation email is sent immediately with a single-use recovery link.
   - All active sessions are invalidated; the user must log in again to do anything.
3. During the 15 days the user can **fully recover** the account:
   - **Path A** — via the recovery link in the email (no login required).
   - **Path B** — by logging in and using the "Recover account" button on the recovery screen.
4. If the user never recovers, a **daily job** (`pnpm --filter @lifeos/api jobs:process-account-deletions`)
   permanently deletes the account when `scheduledDeletionAt` passes.

## Timeline

| When | What happens |
|---|---|
| Day 0 | Deletion requested → confirmation email, sessions invalidated, 15-day timer starts |
| Days 0–14 | User can recover at any time (email link or after login) |
| Day 15 | Daily job sends the final "account deleted" email and permanently erases the account + all data |
| After | An anonymized audit event `{ userIdHash, deletedAt }` is logged (no PII) |

## What gets deleted

Permanently removed (cascade via Prisma `onDelete: Cascade`):

- User account (profile, preferences, email-verification/reset/change/deletion tokens)
- Pillars, habits, completions
- Goals, goal–habit links
- Projects and project tasks
- Daily logs

## What is NOT stored after deletion

- No copy of the data is kept.
- Only an anonymized audit record (`userIdHash`, `deletedAt`) remains for operational
  traceability — it contains no email, name or any other personally identifiable data.

## Recovery guarantees

- Recovery is **idempotent** — recovering an already-active account never errors.
- Recovery tokens are single-use, stored hashed, and expire at the scheduled deletion time.
- During the grace period no other user can access this account's data (all queries are scoped by
  `userId`).

---

_More docs: [Documentation index](../README.md) · [1.6 roadmap](../roadmap/1.6_ROADMAP.md) · [Security](../SECURITY.md)_
