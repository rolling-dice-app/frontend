# CLAUDE.md

This file gives Claude Code (claude.ai/code) the highest-priority instructions for working inside the `rolling-dice-app/frontend` repository.

This is the **frontend** repo of a multi-repo product. It is a Nuxt 4 + Vue 3 + TypeScript SPA. When this file conflicts with a sub-skill, this file wins.

## Required Reading: Org-Level Guidelines

Before any non-trivial change, read the four org-level constitution documents. They define the cross-repo product architecture, the contract flow between repos, ownership boundaries, and the protocol for handling boundary-violating requests. The rest of this file is **frontend-internal technical convention only** and assumes those rules are already in effect.

- <https://raw.githubusercontent.com/rolling-dice-app/guideline/main/product-architecture.md>
- <https://raw.githubusercontent.com/rolling-dice-app/guideline/main/frontend-skills.md>
- <https://raw.githubusercontent.com/rolling-dice-app/guideline/main/backend-skills.md>
- <https://raw.githubusercontent.com/rolling-dice-app/guideline/main/types-skills.md>

In short: this repo is the **contract consumer**. Persistent shapes and API DTOs come from `@rolling-dice-app/types`; the backend is the authoritative implementation; the frontend renders and interacts.

## Common Commands

```sh
pnpm dev               # dev server (http://localhost:3000)
pnpm type-check        # nuxi typecheck
pnpm lint              # oxlint + eslint (with --fix)
pnpm lint:check        # check only, no auto-fix
pnpm format            # prettier --write
pnpm test:unit         # vitest (watch mode)
pnpm test:unit:ci      # vitest --run (CI / single run)
pnpm test:coverage     # coverage report (80% threshold)
pnpm generate          # static SSG (deployed to GitHub Pages)
pnpm preview           # preview static output
pnpm update:ui         # update packages/ui submodule and rebuild
```

Single test file: `pnpm test:unit app/tests/unit/stores/character.spec.ts`
By test name: `pnpm test:unit -t "partial name"`

Git hooks live in `.githooks/` (configured by the `prepare` script via `core.hooksPath`).
`lint-staged` runs oxlint → eslint → prettier on commit. Do not bypass with `--no-verify`.

## Architecture

### Monorepo Layout (this repo only)

This repo is a pnpm workspace (`pnpm-workspace.yaml`) with two sub-projects:

- `app/` — the Nuxt application. **All `.claude/skills/` and the rest of this file apply only here.**
- `packages/ui/` — Vue component library, **git submodule**, with its own dev and build pipeline. The app **consumes only**; do not modify its source. Customizations belong in `app/components/`.

The `@ui` alias is defined in both `nuxt.config.ts` (pointing to `packages/ui/dist/index.js`, the build output) and `vitest.config.ts` (pointing to `packages/ui`). **The submodule must be initialized and built or the app will not run.** First-time clone requires `pnpm init:ui`.

### Cross-Repo Dependencies

- `@rolling-dice-app/types` — the shared contract package, published from the `types` repo to GitHub Packages (restricted scope `@rolling-dice-app`, install requires a `read:packages` PAT). Persistent domain types, request/response DTOs, and shared enumerations are imported from here. Local re-declaration of these shapes is forbidden.
- `backend` API — once online, the only sanctioned channel for persistent data. Frontend speaks to it using the contracts in `@rolling-dice-app/types` and never assumes DB schema.

### Runtime Environment

- **SPA mode** (`ssr: false`) for the current MVP. SSR / server-route rules in skills are forward-looking; under CSR only the CSR rules are enforced.
- Static deployment (GitHub Pages for the frozen demo; Vercel for the live product). Base URL controlled by `NUXT_APP_BASE_URL`; see `nuxt.config.ts`.

### Auto-import Configuration

`nuxt.config.ts` extends `imports.dirs`:

- `helpers/` — pure business-logic functions (rule calculation, tier resolution).
- `composables/domain/` — domain-logic composables.
- `composables/ui/` — UI-layer composables.

These three directories are **available without explicit import**. `utils/` follows Nuxt's default auto-import.

### `app/` Layout

- `components/{common,layout,business}/` — UI layer; `business/` houses domain-specific components.
- `composables/{domain,ui}/` — reusable logic; `domain/` for business, `ui/` for UI behavior.
- `constants/` — static lookup tables, enum-like maps, storage keys. Pure data, no behavior.
- `helpers/` vs `utils/` — `helpers/` carry domain semantics (D&D rules etc.); `utils/` are general-purpose.
- `mocks/` — development fixture data used while the backend is unavailable; will be retired once the backend is wired.
- `stores/` — Pinia. Reserved for cross-component / cross-page shared state. One-shot page state stays local.
- `types/{business,layout}/` — type definitions organized by layer. **Persistent / contract types are imported from `@rolling-dice-app/types`**; what stays here is UI-only: form state, view models, navigation, dice / adventure history.
- `pages/` — Nuxt file-based routing; pages handle assembly and orchestration only.
- `app.vue` / `error.vue` — top-level entry and global Nuxt error page (4xx / 5xx).

### Testing

- Vitest + `@vue/test-utils` + `happy-dom` / `jsdom` (config uses `jsdom`).
- Setup file: `app/tests/setup.ts`.
- Test file location: `app/tests/**/*.spec.ts` (**not** colocated).
- Coverage threshold: 80% (lines / functions / branches / statements). Excludes `types/`, `tests/`, `assets/`.
- `@vue/devtools-api` is mocked (see `vitest.config.ts`); pinia is inlined.

### Linting (Two-Pass)

`lint` runs `oxlint --fix` then `eslint --fix`. oxlint is the fast first pass; eslint (with `@nuxt/eslint`) is the comprehensive second pass. Both must be green.

## Repo-Internal Scope

1. This is a pnpm monorepo containing `app/` (the Nuxt application) and `packages/ui/` (a Vue component library).
2. All `.claude/skills/` conventions apply **only to code under `app/`**.
3. `packages/ui/` is an independent sub-project with its own conventions and build pipeline; it is not bound by Nuxt-ecosystem rules.
4. The app consumes the UI library's components and CSS tokens via the `@ui` alias but does not modify the library's internals.
5. **Do not** edit `packages/ui/` from within the app. File issues against the library separately; build customizations inside `app/components/`.

## Runtime Environment Rules

1. The current MVP runs in SPA mode (`ssr: false`).
2. **CSR rules are the active standard.**
3. SSR / server-route rules in skills are reserved for future activation; they do not apply under SPA.
4. When SSR is enabled in the future, those rules become live.

## Core Principles

1. Prefer the smallest necessary change. No unauthorized large rewrites.
2. Prefer readability, maintainability, and reviewability over clever abstractions.
3. Prefer Vue / Nuxt idiomatic patterns over generic patterns that fit the framework poorly.
4. Clearly separate UI, state, data fetching, data transformation, and side effects.
5. Type safety is baseline. Do not use `any` unless explicitly permitted.
6. Respect runtime boundaries: under SPA, CSR rules govern; once SSR ships, SSR / CSR boundary rules apply.
7. Do not add third-party packages without explicit authorization.
8. Code must be easy for a human engineer to read, review, and inherit.
9. Practical first; idiomatic Vue / Nuxt second.
10. Clear separation of concerns, but not over-abstracted.

## Vue (summary)

1. Vue SFCs default to `<script setup lang="ts">`.
2. Derivable values use `computed`.
3. `watch` is reserved for side effects, synchronization, and external-change reactions — not as a default derivation tool.
4. Avoid heavy logic in templates.
5. props, emits, slots have clear semantics.
6. Do not over-abstract components for theoretical reuse.
7. Do not mix rendering, fetching, navigation, transformation, and flow control in a single component.

Detailed rules: `.claude/skills/vue-conventions/`.

## Nuxt (summary)

1. Server vs client execution must be explicit.
2. First-screen SSR-critical data prefers `useAsyncData`.
3. `useFetch` is for resource-style fetches that match its semantics.
4. Event-driven or non-initial requests may use `$fetch`.
5. Do not directly use `window`, `document`, `localStorage` without a client guard.
6. Pages handle assembly and orchestration; they do not carry low-level transport detail.
7. Sensitive data, aggregation logic, or security boundaries belong in server routes.

Detailed rules: `.claude/skills/nuxt-conventions/`.

## TypeScript (summary)

1. Avoid `any`.
2. Prefer explicit domain types over loose object shapes.
3. Layer DTO / API response / UI model when needed.
4. Do not use unsafe assertions to mask design issues.
5. Preserve narrowing, nullable safety, and optional-field handling.

Detailed rules: `.claude/skills/typescript-conventions/`.

## State Management (summary)

1. Default to local state.
2. Promote to Pinia only when state is genuinely shared across components or pages.
3. Do not promote one-shot page UI state to a global store.
4. Store actions stay focused; do not let stores become miscellaneous service containers.

Detailed rules: `.claude/skills/pinia-conventions/`.

## Skill Index

Detailed conventions live in `.claude/skills/`. Claude auto-loads the relevant skill based on the file paths being edited.

| Skill                        | Topic                                          | Trigger paths                                                                |
| ---------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `vue-conventions`            | Vue SFC structure, reactivity, component duty  | `app/**/*.vue`                                                               |
| `nuxt-conventions`           | SSR/CSR boundary, data fetching, error.vue     | `app/{pages,layouts,middleware,plugins,composables,server}/**`               |
| `pinia-conventions`          | Store design, storeToRefs, async actions       | `app/stores/**`, `app/**/*store*.ts`                                         |
| `typescript-conventions`     | Type design, safety, naming                    | `app/**/*.{ts,tsx,vue}`                                                      |
| `tailwind-conventions`       | Class ordering, responsive, tokens, @apply     | `app/**/*.{vue,tsx,jsx}`, `app/components/**`                                |
| `testing-conventions`        | Vitest, @vue/test-utils, coverage              | `app/**/*.spec.ts`, `app/tests/**`, `vitest.config.*`                        |
| `accessibility-conventions`  | Semantic HTML, ARIA, keyboard, WCAG AA         | `app/**/*.vue`, `app/components/**`, `app/pages/**`                          |
| `security-conventions`       | XSS, sensitive data, server-route validation   | `app/**/*.{vue,ts}`, `app/server/**`, `app/composables/**`, `app/plugins/**` |
| `error-handling-conventions` | Three-state UI, API errors, form errors        | `app/**/*.{vue,ts}`, `app/pages/**`, `app/composables/**`, `app/server/**`   |
| `performance-conventions`    | Load optimization, Web Vitals, bundle hygiene  | `app/**/*.{vue,ts}`, `app/pages/**`, `app/composables/**`, `nuxt.config.ts`  |
| `structure-conventions`      | Monorepo layout, folder structure, layering    | `app/**`                                                                     |
| `review-conventions`         | Code review checklist                          | `app/**`                                                                     |

## Default Output Expectations

When asked to **implement**, typically output:

1. Task understanding or problem analysis
2. Proposed approach
3. Code or diff
4. Risks and verification suggestions

When asked to **review**, typically output:

1. Issue list
2. Risk levels
3. Minimal-fix proposals
4. Optional deeper-refactor directions

When asked to **debug**, typically output:

1. Most likely root cause
2. How to verify
3. Minimal fix
4. Secondary possibilities

## Anti-patterns

1. Using `watch` for problems solvable by `computed`.
2. A single composable mixing fetching, routing, toast, submit, and UI orchestration.
3. Promoting one-shot local UI state to Pinia.
4. Pages depending on unstable raw API response shapes.
5. Touching browser APIs in SSR context without guards.
6. Unauthorized large refactors.
7. Adding abstraction layers without demonstrated need.
8. Locally re-declaring persistent or contract types instead of importing from `@rolling-dice-app/types`.

## Scope Control

Unless explicitly requested, do not:

- Rename files broadly.
- Add new packages.
- Restructure folders.
- Change existing public component APIs.
- Modify unrelated modules.
- Author or modify shared contract types here (those changes route through the `types` repo per the org-level guideline).
