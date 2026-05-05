---
name: structure-conventions
description: Project structure conventions — monorepo (app/ vs packages/ui/), @ui barrel import, app folder layering (components / composables / stores / types / utils / helpers / tests), file-placement decision order. Auto-load when adding files, planning modules, or proposing refactor locations.
paths: app/**
---

# Project Structure Conventions

## Monorepo Overview

This repo is a pnpm monorepo with two main blocks:

```txt
frontend/
├─ app/                    # Nuxt application (the product)
├─ packages/
│  └─ ui/                  # Vue component library (independent sub-project)
├─ public/
├─ nuxt.config.ts
├─ package.json
├─ pnpm-workspace.yaml
└─ tsconfig.json
```

### `app/` — the Nuxt application

- The product code for this repo.
- All `.claude/skills/` rules apply only here.
- Imports components and tokens from `packages/ui` via the `@ui` alias.

### `packages/ui/` — the Vue component library

- Independent Vue 3 component library; does not depend on the Nuxt ecosystem.
- Has its own build pipeline (Vite library mode), test strategy (Storybook + Playwright), and design-token system.
- **Not bound by** Nuxt, Pinia, server-route, or other app-layer rules.
- The app may consume the library's components and CSS tokens but must not modify the library's internals.

### `@ui` Alias

```ts
// nuxt.config.ts
alias: { '@ui': fileURLToPath(new URL('./packages/ui/dist/index.d.ts', import.meta.url)) }
```

Usage:

```ts
import { Button, Modal } from '@ui'
```

### Import Rules

1. UI library imports go **only through the `@ui` barrel**; never bypass it for an internal path:

   ```ts
   // ✅ Correct
   import { Button, Modal } from '@ui'
   import type { ButtonProps, ModalProps } from '@ui'

   // ❌ Forbidden — bypassing the barrel
   import Button from '@ui/src/components/button/Button.vue'
   import { useFocusTrap } from '@ui/src/composables/useFocusTrap'
   ```

2. If a needed module is not yet exported from the barrel, file a request against the library — do not work around it.
3. Modules under `app/components/` and `app/composables/` are auto-imported by Nuxt; **do not** write explicit imports for them.
4. Do not write redundant explicit imports for app modules covered by Nuxt auto-import.

### Component Spec Lookup

1. Before using a `@ui` component, consult `packages/ui/src/components/<name>/README.md` for props, emits, slots, and usage.
2. The component catalog lives at `packages/ui/README.md`.
3. When modifying the library itself, follow `packages/ui/.github/`'s independent rules — these instructions do not apply there.

### Sub-Project Independence

1. **Do not** modify anything under `packages/ui/` from within the Nuxt project (`app/`).
2. If you find a library bug or a design issue, file an issue separately; do not patch the library directly.
3. If a project requirement diverges from the library too much, treat it as a customization and build it inside `app/components/` under the Nuxt project.
4. The two sub-projects stay fully independent.

## Cross-Repo: Where Contract Types Come From

Persistent domain types, request / response DTOs, and shared enumerations live in the `@rolling-dice-app/types` package — published from the `types` repo. They are imported into the app and **never** redeclared locally.

Local types in `app/types/` cover UI-only concerns: form state, view models, navigation, dice / adventure history, etc.

See the org-level `frontend-skills.md` for the full responsibility split, and `typescript-conventions` for naming.

---

## `app/` Folder Layout

Preferred folder layout under `app/`. When adding files, planning modules, or proposing refactor locations, this layout is the first reference.

```txt
app/
├─ assets/
│  ├─ css/
│  └─ images/
├─ components/
│  ├─ common/
│  ├─ layout/
│  └─ business/
├─ composables/
│  ├─ ui/
│  └─ domain/
├─ constants/               # static lookup tables, enum-like maps, storage keys
├─ helpers/
├─ layouts/
├─ middleware/              # add when SSR or route guards are introduced
├─ mocks/                   # development / fixture data (will be retired once backend is wired)
├─ pages/
├─ plugins/                 # add when global plugins are needed
├─ server/                  # add once SSR is enabled
│  ├─ api/
│  ├─ utils/
│  └─ services/
├─ stores/
├─ types/
│  ├─ business/             # frontend-only domain (form state, view models, dice / adventure)
│  └─ layout/               # navigation / layout shapes
├─ tests/
│  ├─ unit/
│  │  ├─ composables/
│  │  ├─ utils/
│  │  ├─ helpers/
│  │  └─ stores/
│  ├─ component/
│  ├─ e2e/
│  ├─ fixtures/
│  └─ __mocks__/
├─ utils/
├─ app.vue
└─ error.vue                # global Nuxt error page (4xx / 5xx)
```

## Folder Definitions

### `components/common`

- Highly reusable, low-business-coupling components.
- Buttons, inputs, cards, tags, base dialog scaffolding.

### `components/layout`

- Layout-related components.
- Header, sidebar, footer, page container.

### `components/business`

- Components tied to a business flow or specific feature.
- Product filter panels, order lists, member info blocks.

### `composables/ui`

- UI-interaction-leaning, presentation-coordination logic.
- Modal control, tab switching, list filter UI state.

### `composables/domain`

- Business-flow- or data-flow-leaning composables.
- Search criteria handling, pagination flow, form submission flow.

### `server/api`

- Nuxt server routes.
- ⚠️ Currently SPA mode; create this once SSR is enabled.

### `server/utils`

- Server-only pure utility functions.

### `server/services`

- Server-side aggregation, business-flow coordination, external integrations.

### `types/business`

- Frontend-only domain shapes: form state, view models, derived/display types, frontend-only domain that has no backend counterpart (dice history, adventure log, etc.).
- **Persistent / contract types do not live here** — they come from `@rolling-dice-app/types`.

### `types/layout`

- Layout / navigation types (e.g., `navigation.ts`).

### `constants`

- Static lookup tables, enum-like maps, and named constants with no behavior — pure data, not pure functions.
- Examples in this repo: D&D class lists, profession options, spell slot tables, storage key strings, navigation menu definitions.
- Distinct from `helpers/` (functions) and `types/` (shapes); `constants/` ships _values_.
- Distinct from `@rolling-dice-app/types` enums: those are contract enums shared with backend; `constants/` is frontend-only static data and UI metadata.

### `mocks`

- Development / fixture data used while the backend is unavailable.
- Currently consumed by stores and pages directly during the SPA-only MVP phase.
- Will be retired (or migrated under `tests/fixtures/`) once the backend is wired; do not grow new dependencies on it without a reason.

### `utils`

- Frontend pure utilities with no Vue / Nuxt reactivity coupling and **no business semantics**.
- String formatting, date formatting, local-storage wrappers, window utilities, timing primitives.

### `helpers`

- Pure functions strongly tied to business logic.
- No Vue / Nuxt reactivity, no lifecycle / route-context dependency.
- Tier resolution, skill-point computation, D&D rule judgments.
- Auto-imported by Nuxt via `imports.dirs: ['helpers']`.

### `error.vue`

- Nuxt's global error page; lives at `app/error.vue` (top level, alongside `app.vue`).
- Differentiated rendering by `error.statusCode` (404 / 403 / 500); see `error-handling-conventions`.

### `tests/unit`

- Unit tests for composables, utils, helpers, stores.
- Subfolders mirror source modules: `composables/`, `utils/`, `helpers/`, `stores/`.

### `tests/component`

- Vue component interaction-behavior and props / emits contract tests.

### `tests/e2e`

- Nuxt integration or end-to-end tests (when present).

## Layout Usage

1. New files go into the existing folder that best matches their responsibility.
2. Don't create a new category for one-off use without a real reuse case.
3. New features that already fit the layering reuse the existing tree.
4. If the project already has a convention, follow it; don't reorganize at scale just to match an idealized layout.
5. Deviations require a stated reason and trade-off, not a casual extra layer.

## Per-Folder Role Preferences

### `pages/`

1. Holds Nuxt pages.
2. Pages handle composition and orchestration.
3. Pages don't carry low-level data transformation or complex logic.
4. If a page is too heavy, extract a component or composable first.

### `components/`

1. Holds reusable Vue components or page-assembly components.
2. Components focus on UI rendering and interaction.
3. If a component is single-page-only with no reuse value, it can live close to the page — but if the project already centralizes, follow that.
4. Shared and business components separate by project scale, e.g.:
   - `components/common`
   - `components/layout`
   - `components/business`

### `composables/`

1. Holds reusable logic and state-coordination logic.
2. Composables maintain single responsibility.
3. Composables don't become large business-flow containers.
4. If logic is single-page-only and not reusable, evaluate whether it really belongs in `composables/`.

### `stores/`

1. Holds Pinia stores.
2. Only cross-component / cross-page shared state.
3. Don't put one-off page UI state into a store.
4. Stores are domain-bounded, not utility dumping grounds.

### `types/`

1. Shared TypeScript types under `app/types/` cover frontend-only concerns. Contract types come from `@rolling-dice-app/types` and are imported, not redeclared.
2. Layer locally by purpose:
   - `types/business` — frontend-only domain (form state, view models, dice / adventure shapes)
   - `types/layout` — navigation / layout shapes
3. Naming and responsibility stay clear; perfect folder mirroring is not required.
4. Local-only types may live next to their module; truly shared frontend-only types centralize under `types/`.

### `server/`

> ⚠️ Currently SPA mode; create this once SSR is enabled.

1. Holds Nuxt server routes, server utilities, server-only logic.
2. Anything involving private runtime config, aggregation, or sensitive handling lives in `server/`.
3. Don't put server-only logic in client-accessible areas.

### `utils/`

1. Frontend pure utilities with no Vue / Nuxt coupling and **no business semantics**.
2. If logic depends on reactivity, lifecycle, or route context, it does not belong in `utils/`.
3. Don't disguise business logic as a util; business-aware pure functions go to `helpers/`.

### `helpers/`

1. Pure functions tied to business logic — rule computation, tier resolution, data transforms.
2. No Vue / Nuxt reactivity, no lifecycle / route context.
3. Auto-imported by Nuxt via `imports.dirs`; usage is the same as `utils/`.
4. If a function carries no business semantics, it belongs in `utils/`, not `helpers/`.

### `tests/`

1. Unit tests (composables, utils, stores) live under `tests/unit/`, organized by source module.
2. Vue component tests live under `tests/component/`.
3. Nuxt integration / E2E tests live under `tests/e2e/` (when present).
4. If the project already uses co-location, follow that — don't switch on a whim.
5. Test names mirror source files with `.spec.ts` (e.g., `useCart.spec.ts`).
6. Don't mix fixtures, mock data, or test helpers across test layers; centralize in `tests/fixtures/` or `tests/helpers/`.

## Type Structure Preferences

1. Centralize shared types rather than scattering them next to components.
2. Component-related types live close to the component, or under `types/business` if reused across features.
3. API DTOs and response shapes come from `@rolling-dice-app/types`; don't restate them under `types/`.
4. Distinguish domain model and UI model by naming.
5. Suggested naming:
   - `XxxDto` (from `@rolling-dice-app/types`)
   - `XxxResponse` (from `@rolling-dice-app/types`)
   - `XxxModel` / `XxxViewModel` (frontend-local)
   - `XxxFormState` / `XxxDraft` (frontend-local form shapes)

## Component Structure Preferences

1. Highly shared components go into shared folders.
2. Layout-related components stay in the layout group.
3. Business-flow-coupled components don't get prematurely promoted to global shared components.
4. The same UI pattern in multiple pages is the trigger for extraction.

## Composable Structure Preferences

1. Composable names are prefixed with `use` (e.g., `useXxx`).
2. As project scale grows, split by responsibility:
   - `composables/domain`
   - `composables/ui`
3. A composable should not simultaneously carry:
   - API fetching
   - router control
   - toast
   - form submission
   - UI orchestration
     unless these responsibilities sit within an acceptable bounded scope.

## File-Placement Decision Order

When adding a file, decide in this order:

1. Is it a page, component, composable, store, type, server module, util, helper, constant, or mock?
2. Pure data with no behavior → `constants/`. Pure functions with business semantics → `helpers/`. Pure functions without business semantics → `utils/`. Reactive logic → `composables/`.
3. Is it shared or local?
4. Should it be centralized, or live close to its consumer?
5. With no clear reuse case, don't preemptively create deep structure.
6. If a new placement breaks existing consistency, follow existing conventions.

## Restructuring Principles

1. Don't refactor folders at scale just for theoretical tidiness.
2. New features reuse existing structure first.
3. Restructure only when existing structure clearly hurts maintainability.
4. Cross-folder bulk moves require a stepwise plan first.

## Anti-patterns

1. Putting everything into `components/`.
2. Scattering types randomly across files.
3. Promoting one-off local logic to a global shared module too early.
4. Letting `stores/` become a catch-all for state.
5. Mixing Vue / Nuxt-coupled logic or business logic into `utils/` (business pure functions belong in `helpers/`).
6. Trading long-term maintainability for short-term convenience.
7. Creating deep nested folders without a clear need.
8. Scattering test files without a unified strategy; pick centralized vs. co-located early and stay consistent.
9. Mixing production code, shared mocks, and test logic inside `tests/` without clear layering.
10. Locally restating types that belong in `@rolling-dice-app/types`.

## Output Requirements

When proposing file location, module split, or folder adjustments:

1. State the recommended location explicitly.
2. Explain why that folder.
3. Stay consistent with the existing structure.
4. Avoid unnecessary structural growth.
5. When alternatives exist, name the trade-offs.
