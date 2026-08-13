# LifeOS — Frontend Quality Audit

> (see [`docs/roadmap/IMPROVE_ROADMAP.md`](../roadmap/IMPROVE_ROADMAP.md)).

## Performance

**Route-level code-splitting (implemented).** All 16 pages are lazy-loaded via `React.lazy`
(`apps/web/src/router.tsx`) with a shared `RoutePending` spinner fallback.

| Measure | Before | After |
|---|---|---|
| Initial JS bundle | 1,406 kB (412 kB gzip) | **278 kB (87 kB gzip)** — ~5× smaller |
| Heavy dependency `recharts` (charts) | bundled upfront | split into its own lazy chunk (346 kB), loaded only on chart pages |

Further notes:

- Route chunks are produced automatically by Vite's build (each page = its own chunk).
- Lazy loading is exercised by the web integration tests (they render the router and wait for
  pages) — the async timeout was raised to 5 s in `src/test/setup.ts`.
- **Manual (pending a real deploy):** Lighthouse/PageSpeed on the production pages, image
  optimization of the static screenshots, and profiling of re-renders/API waterfalls (the main
  fetches already run in `Promise.all`, e.g. dashboard `useDashboard`).

## Accessibility

Audited the main flows (login, register, onboarding, dashboard, habits, goals, projects, journal,
progression, profile):

| Area | Status |
|---|---|
| Keyboard navigation | ✅ all interactive elements are real `<button>`s/links; icon buttons carry `aria-label` |
| Focus states | ✅ focus-visible rings throughout (shadcn/base-ui + custom `focus:ring`) |
| Semantic HTML | ✅ headings, lists, `<label>`+input association in all forms |
| Labels | ✅ every form field has a `<Label>`/`htmlFor`; modals use `aria-describedby` |
| ARIA | ✅ dialogs (focus trap + Escape), `aria-pressed` toggles, `aria-live` form errors (`role="alert"`) |
| Dialogs | ✅ base-ui Dialog manages focus trap + Escape; destructive actions use AlertDialog |
| Form errors | ✅ field-level errors with `role="alert"` + `aria-invalid`/`aria-describedby` |
| Buttons | ✅ `type="button"` added where needed (e.g. `month-navigation`) to avoid accidental submits |
| Contrast | ✅ contrast sweep already done in Phase 2 (`/25→/40`, `/45→/60`, `/50→/60`) |
| Skip link | ✅ "Skip to content" in the app layout |
| Screen reader | ✅ manual pass with a real screen reader (pending) |

## Required UI states

Verified for the critical operations: login, register, habit creation, habit completion, goal
creation, project/task manipulation.

| Operation | Loading | Empty | Error | Retry | Disabled | Optimistic/pending |
|---|---|---|---|---|---|---|
| Login / register | ✅ submit spinner | — | ✅ toast | — | ✅ disabled while submitting | — |
| Dashboard (completion) | ✅ skeleton | ✅ EmptyState | ✅ ErrorState | ✅ Try again | ✅ per-cell disabled | ✅ optimistic + rollback |
| Habits / settings | ✅ spinner | ✅ EmptyState | ✅ ErrorState | ✅ | ✅ delete/archive disabled | — |
| Goals | ✅ spinner | ✅ EmptyState | ✅ ErrorState | ✅ | ✅ delete disabled | — |
| Projects / tasks | ✅ spinner | ✅ EmptyState | ✅ ErrorState | ✅ | ✅ create/delete disabled | — |

`ErrorState` (with retry) is used on all 12 data pages; `EmptyState` on 6.

## Responsiveness

The app is mobile-first by design (Phase 2):

- Dashboard: mobile shows a **Today checklist** (large 44px targets) and the month grid + yearly
  heatmap adapt on `md+`.
- Progression: carousel + dots; grids collapse to single columns.
- Forms/modals: dialogs scroll internally on small screens; two-column layouts collapse to one.
- Sidebar: collapsible (icon rail / overlay Sheet on mobile).

**Manual (pending device testing):** final pass at 320 / 375 / 768 / 1024 / 1440 px for overflow
and touch targets.

---

_More docs: [Documentation index](../README.md) · [Testing](../qa/TESTING.md) · [LifeOS README](../../README.md)_
