# Internationalization (i18n)

LifeOS is fully translatable and ships with three languages: **English (`en`)**, **Portuguese (`pt`)**, and **Ukrainian (`uk`)**.

- The entire interface (every user-visible string) comes from translation files — no hardcoded UI text.
- The language is selectable from **Profile → Preferences → Language** (instant switch, no reload).
- The choice persists in `localStorage` (pre-login) and in `User.locale` on the backend (post-login), so it follows the user across devices.
- Transactional emails are localized using the user's locale at send time.

## How the language is chosen

1. **Automatic detection** on first access: `navigator.language` (browser) → normalized (e.g. `pt-PT` → `pt`), falling back to `en` when the language isn't supported.
2. **Manual choice wins**: once the user picks a language, it is stored in `localStorage` (`lifeos.locale`) and takes priority over detection.
3. **Post-login**: the account's `User.locale` is used and synced back whenever the user changes the language.

## Where the translations live

### Web app — `apps/web/src/i18n/`

```
i18n/
├── index.ts                      # i18next init, detection, persistence, resources loader
├── locales/
│   ├── en/                       # English (reference language)
│   │   ├── common.json           # shared UI labels
│   │   ├── auth.json             # login/register/recovery screens
│   │   ├── dashboard.json        # weekly tracker, habit grid
│   │   ├── habits.json           # habit/pillar cards, frequency
│   │   ├── goals.json            # goals module
│   │   ├── projects.json         # projects module
│   │   ├── journal.json          # journal module
│   │   ├── progression.json      # progression module
│   │   ├── statistics.json       # statistics/insights module
│   │   ├── settings.json         # profile/settings
│   │   ├── onboarding.json       # onboarding screens
│   │   └── landing.json          # public landing page
│   ├── pt/                       # Portuguese — same structure
│   └── uk/                       # Ukrainian — same structure
├── ...
```

All namespaces are loaded at build time via `import.meta.glob` (see `i18n/index.ts`). A new namespace only needs its `<lang>/<ns>.json` files to be created.

### Emails — `apps/api/src/lib/email/i18n/`

```
i18n/
├── en.json                       # English email copy
├── pt.json                       # Portuguese email copy
└── uk.json                       # Ukrainian email copy
```

`renderEmail(template, data, locale)` renders every template with the copy for the given locale; `email.service.ts` passes the user's locale through `SendEmailInput.locale`.

## Pluralization

- **English** and **Portuguese** use `_one` / `_other`.
- **Ukrainian** has complex CLDR plural rules and **must** define all four forms: `_one`, `_few`, `_many`, `_other`.

Example (Ukrainian):

```json
{
  "streak_one": "{{count}} день",
  "streak_few": "{{count}} дні",
  "streak_many": "{{count}} днів",
  "streak_other": "{{count}} дня"
}
```

> Ukrainian translations should be reviewed by a native speaker, especially the plural forms.

## Date and number formatting

Locale-aware formatting uses the native `Intl` API (`Intl.DateTimeFormat`, `Intl.NumberFormat`), not hardcoded locales. Helpers live in `apps/web/src/lib/i18n-format.ts`:

- `formatLongDate`, `formatMonthYear`, `formatShortDate` — dates
- `formatPercent`, `formatNumber` — percentages and amounts

Always use these instead of `toLocaleDateString("en-US", …)`.

## Accessibility

The `<html lang>` attribute is updated automatically whenever the language changes (`applyDocumentLang`), keeping screen readers and SEO in sync.

## Key completeness (CI)

A script compares translation keys across all languages and fails the build when one is missing:

```bash
pnpm --filter @lifeos/web i18n:check        # completeness (CI)
pnpm --filter @lifeos/web i18n:check:orphans # orphan keys (warning only)
```

The CI pipeline runs `i18n:check` after the web tests, so incomplete translations block merging.

## Adding a new language

1. **Create the locale folder**: `apps/web/src/i18n/locales/<code>/` with the same `.json` files as `en/`.
2. **Copy `en/` files as a starting point** and translate every value (keep the keys identical).
3. **Follow the plural rules** of the new language (add the `_one`/`_few`/`_many`/`_other` keys the language requires).
4. **Register the language**:
   - Add it to `SUPPORTED_LOCALES` and `LOCALE_NAMES` in `apps/web/src/i18n/index.ts`.
   - Add it to the shared `SUPPORTED_LOCALES` in `packages/shared/src/schemas/auth.ts` (so `PATCH /auth/me` accepts it).
   - Add an email copy file at `apps/api/src/lib/email/i18n/<code>.json` and register it in `apps/api/src/lib/email/i18n/index.ts`.
   - Add it to `LANGUAGES` in `apps/web/scripts/check-i18n-keys.mjs`.
5. **Run the checks**:
   ```bash
   pnpm --filter @lifeos/web i18n:check
   pnpm --filter @lifeos/web i18n:check:orphans
   pnpm --filter @lifeos/web typecheck && pnpm --filter @lifeos/web lint
   pnpm --filter @lifeos/web test
   pnpm --filter @lifeos/api test
   ```
6. **Add the language to the dropdown test** (`apps/web/src/test/i18n.test.tsx`) and, ideally, extend an E2E smoke test to render 2–3 key screens in the new language.
