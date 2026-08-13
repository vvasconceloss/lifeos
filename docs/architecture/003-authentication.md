# ADR 003 — Authentication (JWT in an HTTP-only cookie)

- **Status:** Accepted
- **Date:** 2026

## Context

LifeOS is a single-page app served from one origin and talks to the API through a same-origin
`/v1` rewrite. Sessions must survive page reloads and be usable from the browser without exposing
tokens to JavaScript.

## Problem

How to authenticate users securely given that the API and the web share the same origin in
production (Vercel rewrites `/v1/*` to Render).

## Decision

- Passwords hashed with **bcrypt** (10 rounds); never stored or returned in plaintext.
- On login/register/demo, a **JWT** (`@fastify/jwt`) is signed and set as an **HTTP-only cookie**
  (`HttpOnly`, `SameSite=Strict`, `Secure` in production, `Max-Age` 30 days).
- The JWT carries a **30-day `exp`**; expired/invalid tokens are rejected by `requireAuth`
  (`jwtVerify`) with `401`.
- The cookie is never readable by JS (no `localStorage`), so XSS cannot steal sessions.
- CSRF protection (`@fastify/csrf-protection`) guards every state-changing request with a
  signed `_csrf` cookie + `csrf-token` header.
- A public **demo account** (`demo@lifeos.com`) is seeded for exploration.

## Alternatives considered

- **JWT in `localStorage`** — rejected: readable by any injected script; would require CORS +
  cross-site cookie handling.
- **Server-side sessions in memory** — rejected: not horizontally scalable and unnecessary for a
  stateless JWT + cookie model.
- **OAuth/third-party** — rejected: out of scope for a personal product.

## Trade-offs

- HTTP-only cookies require same-origin deployment (the Vercel `/v1` rewrite is what makes this
  work).
- `SameSite=Strict` blocks cross-site cookie sending by design — fine for a single-origin app.
- Sessions expire after 30 days; users must log in again (no refresh tokens — acceptable here).

## Consequences

- Cookie config (`HttpOnly`, `SameSite=Strict`, `Secure`, `Max-Age`) is centralized in
  `auth.routes.ts`.
- Expired-token and missing-cookie behavior is covered by tests (`auth.test.ts`,
  `failure-scenarios.test.ts`).
