# E2E test harness (Playwright, local stage)

Real-browser end-to-end tests that drive the SSR Nuxt app against a **throwaway**
backend + Postgres stack. Design doc: [`docs/e2e-test-system-design.md`](../docs/e2e-test-system-design.md).

## Prerequisites

- **Docker** running (Testcontainers spins up a disposable `postgres:16`).
- The sibling **backend** checked out and installed: `../backend` with `pnpm install`
  done (it is run from source via `tsx`, no build step). Override the location with
  the `BACKEND_DIR` env var.
- `@rolling-dice-app/core` installed (already a dependency here).
- Ports **3100** (harness Nuxt) and **3101** (harness backend) free. These are
  deliberately off the default dev ports (3000/3001) so a running `pnpm dev` stack is
  never reused or collided with. Override with `E2E_FRONTEND_PORT` / `E2E_BACKEND_PORT`.
  If 3101 is taken, setup fails fast rather than silently using a foreign backend.

## Run

```sh
pnpm test:e2e        # headless run
pnpm test:e2e:ui     # Playwright UI mode, step through the flow
```

`global-setup` brings the stack up once: starts the container, applies the
committed migrations with the backend's `drizzle-kit`, seeds the SRD spell
catalog (`scripts/seed-spells.ts`, an idempotent upsert run unconditionally so
spell flows always have a catalog), spawns the backend with `tsx src/index.ts`,
and polls `/healthz`. The seed step uses the full backend env (it imports
`db/client.ts` → `config/env.ts`, which validates the whole schema at import),
unlike `drizzle-kit`, which only reads `DATABASE_URL`. The Nuxt dev server is
managed by Playwright's `webServer`. `global-teardown` kills the backend and
stops the container; `docker ps` should show nothing left behind.

## How auth works (no production code change)

Each test seeds its own user + session straight into the DB and drops the session
id into the `rd_session` cookie, host-scoped to `localhost`. Because the cookie is
host- (not port-) scoped, both the SSR document request and the client XHR carry it
regardless of port, so first screen and soft navigation are both authenticated.
Per-test fresh users give natural ownership isolation — no table truncation.

## Selector policy

Stable, non-i18n hooks first; `data-testid` only where the alternative is a
translated string:

- **Name input** by its existing element id `#char-name` (not i18n-bound; shared by
  the build and update forms).
- **List rows / per-row delete** by accessible name, where the matched segment is
  the user-provided character name (locale-stable user data, not a translation).
- **`data-testid`** where the only alternative is a translated string — the i18n
  action buttons (`character-build-submit`, `character-build-confirm`,
  `character-update-submit`, `character-delete-mode-toggle`, `character-delete-confirm`,
  the inventory `inventory-add-item-<section>` / `inventory-item-confirm` /
  per-row `inventory-item-edit` / `inventory-item-delete`; the campaign
  `campaign-add-record` / `campaign-record-confirm` / per-row
  `campaign-record-edit` / `campaign-record-delete`; the currency
  `currency-edit` / `currency-edit-confirm`; the combat `combat-hp-max-increment`
  / `combat-reset` / `combat-reset-confirm`; the share `character-share-toggle`)
  and the primary-class
  `@ui` Select (`character-primary-class-select`, whose only other handle is its
  translated label). These are the harness's only production edits.

  Note on the inventory tab: it is reached via the `@ui` tab trigger's stable
  `data-value="backpack"` (not i18n-bound), so it needs no testid; the inventory
  modal's name field already has the `#item-modal-name` id.

  Note on the Select: `id` is a declared prop on the `@ui` component (it lands on a
  hidden proxy input for `<label for>`), so `data-testid` — an undeclared attr that
  falls through to the Select root — is used instead, then scoped down to its
  `role="combobox"`.

  Note on spells (no testid added): the spell slice needs no production edits. The
  spells tab uses the stable `data-value="spells"` (both the detail and update
  pages). On the detail quickview, the favorite toggle is matched by its component
  class `.favorite-btn` scoped to the spell name in its `aria-label` (its
  `aria-pressed` carries the state), avoiding the `FavoriteSpellList`'s name-bearing
  select button. On the update form, the catalog learn checkbox can't be reached by
  `getByRole('checkbox', { name })`: the `@ui` `Checkbox`'s native input is
  `sr-only` and nameless, and the `:aria-label` passed in is an _undeclared_ attr
  that falls through to the wrapper element — so match the labelled wrapper by
  `[aria-label*="<spell name>"]` and click it (the click lands on the inner
  `<label>` and toggles the checkbox). The save button reuses the existing
  `character-update-submit` testid.

  Note on campaigns: the campaigns tab uses the stable `data-value="campaigns"`,
  and the modal fields keep their element ids (`#campaign-title` /
  `#campaign-content`), but the four action elements are i18n-only. The add and
  confirm buttons have no other handle, and the per-row edit / delete pair share
  the record title in their `aria-label` (so the title alone can't tell them
  apart) — all four carry a `data-testid`, mirroring the inventory slice. The
  per-row controls are then pinned by `data-testid` (verb) + `aria-label*=<title>`
  (row), so no accordion-nesting assumption is needed; the row presence probe is
  the title heading.

  Note on currency: it lives under the inventory tab (`data-value="backpack"`) as
  a per-character singleton, so the slice is a read + update round-trip (no
  create / delete) with a single, non-debounced PATCH. The coin fields keep their
  element ids (`#currency-edit-<key>`), shared by the panel and the modal; only
  the i18n-only panel-edit and modal-confirm buttons carry a `data-testid`.
  Persistence is verified by re-opening the modal after a reload and reading a
  coin input back — the modal seeds from the store's currency, which is re-fetched
  from the DB on load, so a surviving value means it persisted.

  Note on combat-state: it lives on the detail page's combat tab
  (`data-value="combat"`, the quickview) and has two write models — field edits
  (e.g. max-HP) fire a debounced PATCH → re-GET, while rest / reset are POSTs that
  return no body and then re-GET the fresh state. The slice covers both via the
  max-HP `(+1)` adjustment, read from the HP card's stable
  `aria-labelledby="quickview-hp-label"` section by its `(+N)` modifier text (from
  `formatModifier`, not i18n), so no display testid is needed; only the three
  i18n-only buttons (max-HP +1, reset, reset-confirm) carry a `data-testid`. The
  reset action waits for both the `/combat-state/reset` POST and its follow-up
  `/combat-state` GET, since the POST has no body and the GET is what clears the UI.

  Note on share: it spans the list page's `ShareMenu` (a Teleported menu) and the
  public read-only page `/share/:shareId`. The menu trigger is matched by its
  `aria-haspopup="menu"` plus the character name in its `aria-label` (locale-stable
  user data); the toggle item is the only production edit — its three menu items are
  i18n-only and the toggle's label flips with `shareable`, so it carries
  `data-testid="character-share-toggle"` (same id in both directions). The public
  read runs in a **cookieless** `browser.newContext()` to prove it needs no session:
  a successful read is genuine unauthenticated (teammate-style) access. The shared
  identity is probed by the `<h1>` name heading and the unavailable (404) state by
  its `role="alert"` — both non-i18n, so no display testid is added.

## Maintenance invariants

- **Seed field shapes follow `backend/tests/helpers/auth.ts`.** When the backend
  changes required columns on `users` / `sessions`, update `e2e/helpers/auth.ts`
  (raw SQL, snake_case columns) to match.
- **Backend env follows `backend/src/config/env.ts`.** `e2e/helpers/env.ts` must
  satisfy every required var (a missing/invalid one makes the backend exit at boot,
  surfacing here as a `/healthz` timeout). Note `R2_PUBLIC_URL_BASE` is required and
  validated (https, no trailing slash).
- **Session ids must stay high-entropy random** (`uuid().defaultRandom()`). The
  seeded-cookie approach assumes session ids are unguessable.
- **Cookie host-sharing** assumes `:3000`/`:3001` share the `localhost` host. If the
  app ever spans real cross-origin hosts, revisit the `addCookies` scope.
