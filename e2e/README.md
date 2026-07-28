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

  Note on detail read (no testid added): the `/character/:id` page fetches its
  character client-only (`useAsyncData(..., { server: false })`), so the slice is a
  single privacy guard with zero production edits. `page.request.get('/character/:id')`
  pulls the raw SSR document (a plain GET, no client JS) and the slice asserts the
  seeded private name is absent from it, guarding against an edge cache (Vercel)
  leaking one user's character; the same name then becomes visible after hydration,
  proving it's client-only by design, not broken. Scoped out on purpose: tab
  switching is `@ui` Tabs' own contract (tested in packages/ui), and deep per-tab
  content is owned by the combat / spells / inventory / currency / campaign slices —
  asserting either here would test another repo's component or duplicate coverage.

  Note on ownership (no testid added): a second user (B) is seeded with
  `seedAuthedUser()` and owns a character via `seedCharacter(B.sessionId)` — B's
  cookie is never placed in the browser, only the authed user A's is. The backend
  ownership preHandler returns **404, not 403**, for a row owned by another user
  (`backend/src/middleware/ownership.ts`, deliberately indistinguishable from a
  missing id to avoid existence leakage), so A opening B's `/character/:id` and
  `/character/:id/update` lands on each page's client-only NotFound branch. The
  NotFound state is probed by its back-to-list link `a[href="/character"]` (a
  stable, non-i18n href) scoped to the `<main>` landmark — the BottomNavDrawer
  carries the same href but is teleported outside `<main>`; the PageHeader back
  control is a `<button>`, not a link. B's name (PageHeader `<h2>`) must stay
  hidden throughout, proving no data leak.

  Note on not-found (no testid added): a freshly generated, never-seeded random
  UUID is opened on `/character/:id` and `/character/:id/update`; both land on the
  same client-only NotFound branch as ownership. The id must be a valid UUID so it
  passes the backend's `z.string().uuid()` params check and reaches the handler
  (where the ownership lookup returns null → 404); a malformed id is a different
  contract — zod rejects it with **400**, which the pages render as the retryable
  transient-error state, not NotFound — so it is deliberately out of scope. The
  slice reuses the ownership POM (same NotFound state, same client-only 404 path;
  only the reason for the 404 differs: missing vs not-owned).

  Note on monster templates: the four `/dm/monster/*` pages already carry stable
  element ids on every form field (`#monster-name` / `#monster-hp` / `#monster-ac`
  / `#monster-cr`, from `monster-form/BasicTab.vue`), so no display testid is
  added. List cards, and the detail page's edit control, are `NuxtLink`s matched
  by their `href` (route shape, non-i18n) rather than their translated label.
  Four i18n-only buttons carry a `data-testid`: `monster-add` (on **both** the
  empty-state hero and the grid tile — they are mutually exclusive branches of one
  `v-if` chain, so only ever one is in the DOM), the per-row `monster-delete`
  (pinned by testid + `aria-label*=<name>`, so no grid-DOM nesting is assumed),
  `monster-delete-confirm`, and `monster-save` on the shared `monster/Form.vue`
  (used by both create and update). A plain `authedPage` is enough here: free plan
  allows `maxMonsterTemplates: 10`, unlike characters (`maxActiveCharacters: 1`)
  where holding two rows forces the super-admin fixture.

  Note on DM session containers / logs: container and log are one usage path (a
  container exists to hold logs; there is no standalone log route), so a single
  spec covers both instead of duplicating the container setup twice. There is no
  `/dm/session/create` route — creation is a quick-create modal on the list page
  that navigates straight into the new container, so the POM reads the new id off
  the resulting URL; the same trick gets the log id, since the log create page
  deliberately lands on the freshly written log rather than back on the container.
  Field ids (`#dm-session-container-title`, `#dm-session-log-title`,
  `#dm-session-log-content`) and the timeline's add-log / edit `NuxtLink` hrefs
  cover everything except five i18n-only buttons: `dm-session-add`,
  `dm-session-container-confirm` (shared by the modal's create and rename modes),
  per-row `dm-session-delete`, `dm-session-delete-confirm`, `dm-session-log-save`.
  **Scoped out on purpose**: member editing (`MemberEditModal`) and the
  attendance / reward fields — each has its own slice, below.

  Note on the DM session member roster: the container's standing roster is edited
  in `MemberEditModal`, whose three per-row inputs all carry a _translated_
  `aria-label` that repeats on every row, so each takes a `data-testid`
  (`dm-session-member-player-name` / `-character-name` / `-link`); the i18n-only
  add-row and confirm buttons take `dm-session-member-add` /
  `dm-session-members-confirm`, and the info card's trigger takes
  `dm-session-edit-members`. The per-row delete button needs none — its
  `aria-label` carries the player name, and it is a `button`, so it can never
  collide with the roster chip, which is a **link** to `/share/:shareId` and is
  therefore matched by href (route shape, not a label). The slice holds a single
  row, so the field selectors are unqualified rather than assuming a row-nesting
  shape. Linking commits on **blur or Enter only** (not on input), and the
  `POST /share/characters/resolve` must be awaited: the read-only character name
  and the player-name snapshot (m7.2 — a linked member's player name is the
  owner's display name, hence `SEEDED_DISPLAY_NAME` in `helpers/auth.ts`) only
  land once it resolves.

  Note on DM session attendance / rewards (two testid groups, no display testid):
  attendance chips need none — the chip is a toggle button whose accessible name
  is the member's player name (user data) and whose `aria-pressed` already
  carries the state. Attendance is **prefilled with the whole standing roster**
  (the DM de-selects absentees), so the round-trip toggles a member _off_, not
  on. The coin and exp fields keep their element ids
  (`#dm-session-log-money-<key>`, `#dm-session-log-exp`); only
  `LogRewardItemList` gets testids (`dm-session-reward-item` / `-player` /
  `-remark` / `-add` / `-delete`) — same repeated-translated-`aria-label`
  situation as the roster rows. Values are read back by re-opening the edit form
  (the currency slice's pattern), which also proves `itemRewards`' replace-whole-
  list write really drops a removed row.

  Note on the battlefield entry list: the list is keyed by **session logs**, not
  containers — a battlefield's `sessionId` is a log id (`listSessionOptions` in
  `backend/src/repositories/battlefields.ts` projects `dmSessionLogs.id`), so two
  logs of one container render two cards while only one may own a battlefield;
  the sibling's create button is `disabled`, pre-blocking the DB UNIQUE. The
  cards have no per-card landmark, so the create / enter buttons carry
  `battlefield-create` / `battlefield-enter` plus an `aria-label` bearing
  `option.sessionTitle` — the same testid-(verb) + `aria-label*=<name>`-(row)
  pairing as `monster-delete`, and a genuine a11y improvement (in a grid, a bare
  "建立戰場" tells a screen-reader user nothing about _which_ session).

  Note on battlefield units: the three unit sources take three different snapshot
  paths (a party member from a _shared_ character, a monster from a template, an
  ad-hoc unit typed in), which is why one slice drives all three. Everything
  upstream — shared character, monster template, container, logs — is seeded
  through the API. The setup drawer's tabs are matched by `data-tab` (non-i18n,
  mirroring `@ui` Tabs' `data-value`); the ad-hoc fields keep element ids
  (`#battlefield-adhoc-name` / `-max-hp` / `-ac` / `-speed` / `-init-bonus`,
  the `#monster-name` precedent); and the i18n-only actions carry
  `battlefield-import-member` / `battlefield-add-template` (each pinned by testid
  - `aria-label*=<name>`), `battlefield-create-adhoc-join`,
    `battlefield-reinforce`, `battlefield-delete`, `battlefield-delete-confirm`.
    Combat rows need no testid: the row is a `role="button"` whose `aria-label`
    carries the unit name, and its HP reads as plain `current/max` digits. The
    drawer is closed with **Escape** before asserting on the workspace behind it.

  Note on battlefield combat: persistence here is unlike every other slice — the
  store debounces a PATCH of the **whole** `units` projection (with `updatedAt`
  as an optimistic-lock token) and then re-GETs to pick up the fresh token. A
  hard reload does _not_ run the route-leave flush, so every assertion that
  outlives a reload goes through `BattlefieldPom.waitForPersist`, which awaits
  the PATCH _and_ its follow-up GET. Because each PATCH carries the full state,
  one awaited persist also covers every earlier un-awaited edit.
  `battlefield-round-meta` mirrors the round and battle sequence onto
  `data-round` / `data-battle-sequence`, so those two numbers are never read out
  of the translated "第 N 場 | Round N" chip. `battlefield-next-turn`,
  `battlefield-sort-initiative`, `battlefield-end-battle`,
  `battlefield-end-battle-confirm`, `battlefield-damage` and
  `battlefield-hp-amount` are i18n-only buttons/fields; note the damage and heal
  controls share one translated `aria-label` shape carrying the unit name, so the
  name alone cannot tell them apart. The start-next-battle testid is on the
  **toolbar** button only — the ended-state banner renders a second one at the
  same time, and a duplicate testid would trip strict mode.
  Ordering is asserted by comparing two rows' positions among the rows inside
  `battlefield-combat-list`; the scope matters because `role="button"` is _not_
  unique to `CombatRow` — the layout's `BottomNavDrawer` handle sets it too, so
  an unscoped match would fold unrelated elements into the ordering. Round
  arithmetic is measured as a delta over
  one full cycle rather than hard-coded — where the turn marker starts is not
  guaranteed. **Scoped out on purpose**: dice rolls (random by design, covered by
  `tests/unit/composables/useBattlefieldDiceRolls.spec.ts`), drag reordering,
  and the faction / condition / death-save controls (covered by component tests).

  Note on multi-field fills (`helpers/form.ts`): `CommonAppInput` defaults to
  `selectOnFocus`, implemented as `requestAnimationFrame(() => target.select())`.
  `select()` focuses the input in Chromium, so a callback still pending when focus
  has already moved fires late and yanks focus back. Two back-to-back Playwright
  `fill()`s land ~5ms apart — well inside one 16ms frame — so the second field's
  text can be typed into the first field. This reproduces as a flaky
  "the edit went into the wrong column" failure, hit on the DM log form and latent
  in the campaign-records POM (`#campaign-title` → `#campaign-content` is the same
  Input→TextArea shape). Every multi-field fill therefore goes through
  `fillSettled()`, which drains one animation frame after each fill. Deliberately
  **not** a production change: a real user cannot move focus between two fields
  inside a single frame, so the deferred `select()` always fires while its own
  input still holds focus.

  Note on auth-guard (no testid added): the `auth` route middleware is client-only,
  so an unauthenticated visit to a protected route (`/settings`, `/character`,
  `/character/build`, detail, update, plus the DM entries `/dm`, `/dm/monster`,
  `/dm/session`) redirects back to `/` once the boot `/auth/me`
  resolves to null (no `rd_session` cookie → 401). The slice uses the base `page`
  fixture (not `authedPage`, so no cookie) and asserts each route lands on `/` with
  the home hero `<img alt="Rolling Dice">` visible (SSR-rendered, non-i18n). The
  detail / update routes use a **constant** dummy id, not `randomUUID()`: a random id
  in the parametrized test title shifts between Playwright's collection and worker
  passes, breaking the run with "Test not found in the worker process"; the id value
  is irrelevant anyway since the guard redirects before any client-only fetch. A
  `/dm` is a `redirect: '/dm/monster'` route record — route-level redirects resolve
  during matching, so it is actually `/dm/monster`'s middleware that lands the visit
  on `/`; the assertion is the observable contract ("unauthenticated `/dm` ends on
  `/`"), not which layer stopped it. A
  small `AuthGuardPom` is added (the guard spans `/settings` and `/dm/*` too, so it isn't
  character-specific).

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
- **Seeding goes through the real endpoints**, never hand-written rows, so the
  create contracts stay the single source of truth. `helpers/api.ts` carries the
  shared transport (cookie + the `Origin` that `requireSameOrigin` demands); the
  `seed*` helpers on top of it are one per resource. A helper that starts failing
  with a 400 is reporting a contract change, not a harness bug.
- **Cookie host-sharing** assumes `:3000`/`:3001` share the `localhost` host. If the
  app ever spans real cross-origin hosts, revisit the `addCookies` scope.
