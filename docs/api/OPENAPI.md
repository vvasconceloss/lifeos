# LifeOS — OpenAPI & Swagger UI

> Result of **Phase 5 — API Contract and Database Review**
> (see [`docs/roadmap/IMPROVE_ROADMAP.md`](../roadmap/IMPROVE_ROADMAP.md)).

## Browsing the API

The OpenAPI 3.0 document is served by the API itself. With the API running:

- **Swagger UI:** `GET /docs` (on the API host)
- **Raw spec (JSON):** `GET /docs/json`
- **Raw spec (YAML):** `GET /docs/yaml`

Everything is on the API host — the Swagger UI is mounted at the root (`/docs`), while all data routes live under `/v1`.

## How it works

- The document lives in `apps/api/src/openapi.ts` — a hand-curated OpenAPI 3.0 contract describing
  every endpoint group (auth, pillars, habits, completions, goals, projects, daily logs,
  statistics, progression, system).
- `apps/api/src/plugins/openapi.ts` registers `@fastify/swagger` (static mode, `exposeRoute`) and
  `@fastify/swagger-ui` at the `/docs` route prefix, so the UI and the machine-readable spec are
  always available.
- Authentication is described as a cookie security scheme (`token` cookie).
- The **error contract** (Phase 2) is baked in: responses reference a shared `Error`
  (`{ error: { code, message, details? } }`) component, and the 400/401/404/409/429 responses are
  standard `$ref`s across all paths.

## Coverage

All public and protected endpoints are documented with parameters, request bodies, response codes
and the shared error schema — verified by a contract test (`app.test.ts` → "serves the OpenAPI
document" / "serves the Swagger UI").

---

_More docs: [Documentation index](../README.md) · [Error contract](ERROR_CONTRACT.md) · [LifeOS README](../../README.md)_
