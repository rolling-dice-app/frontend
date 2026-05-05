---
name: testing-conventions
description: Testing conventions — Vitest, @vue/test-utils, @nuxt/test-utils, test placement (tests/unit / component / e2e), writing principles, composable / component / store strategies, mock principles, snapshot, coverage. Auto-load when editing test files or asked to add tests.
paths: app/**/*.spec.ts,app/**/*.test.ts,app/**/*.spec.vue,app/tests/**,vitest.config.*
---

# Testing Conventions

Apply these rules when working with test files or when asked to add tests.

## Tooling

1. Unit and integration tests use **Vitest**.
2. Vue component tests use **@vue/test-utils**.
3. Nuxt integration tests use **@nuxt/test-utils**.
4. Do not introduce Jest or another test framework unless explicitly directed.

## Test File Placement

1. Unit tests (composables, utils, stores) live under `tests/unit/`, organized by source module:
   - `tests/unit/composables/`
   - `tests/unit/utils/`
   - `tests/unit/stores/`
2. Vue component tests live in `tests/component/`.
3. Nuxt E2E or integration tests live in `tests/e2e/` (when present).
4. If the project already uses co-located tests, follow the existing convention; do not flip to a centralized layout on a whim.
5. Test files mirror source filenames with a `.spec.ts` suffix (e.g., `useCart.spec.ts`).

## Test Target Priority

By value, highest to lowest:

1. **composables** — composables holding business logic, state coordination, or side effects come first.
2. **utils** — pure functions; easiest to test with the most stable output; full coverage.
3. **store actions** — async flow, state transitions, error branches.
4. **components** — interaction behavior and props / emits contracts; don't test internal implementation.
5. **pages** — page tests are expensive; cover via integration or E2E rather than unit tests.

## Writing Principles

1. One test asserts one behavior or scenario; don't combine multiple assertions in a single `it`.
2. Test names express business meaning, not implementation:
   - Good: `it('disables the add-to-cart button when item count is 0')`
   - Bad: `it('should set disabled to true when count eq 0')`
3. Prefer `Arrange / Act / Assert` structure for readability.
4. Tests are independent; one test's outcome does not depend on another.
5. Don't assert against implementation detail (e.g., internal variables); assert against observable behavior.

## Composable Tests

1. Use `withSetup` or `mountSuspended` to wrap composables that need lifecycle.
2. Test the return shape, initial state, and state transitions after operations.
3. Async composables cover loading, success, and error.
4. If the composable depends on Nuxt composables (`useRoute`, `useFetch`), mock them.

## Component Tests

1. Use `mount` or `shallowMount` from `@vue/test-utils`.
2. Prefer `shallowMount` to isolate child components and reduce complexity.
3. Focus:
   - Render output for given props.
   - User interactions (click, input) and emitted events.
   - Slot rendering.
4. Don't assert CSS class details unless the class has observable functional meaning.
5. **Element selection priority** (testing-library style — pick the first that fits):
   1. **ARIA-driven**: `aria-label`, `aria-labelledby`, `role`, `aria-pressed`, `aria-disabled`, `aria-expanded`, etc. Drives behavior tests **and** surfaces a11y gaps — if the component has no ARIA hook to grab, the component's accessibility is incomplete.
   2. **Visible text content**: only when the text is stable and not subject to i18n churn (`wrapper.text().toContain('已穩定')`).
   3. **`data-testid`**: fallback when no semantic anchor exists, or for dynamic list items needing a stable key (e.g., `data-testid="character-card-${id}"`). Add a `data-testid` to the production component only when steps 1–2 cannot reach the element.
   4. **Avoid**: CSS class names, structural selectors (`div > div > button:nth-child(2)`), and `id`. These couple tests to styling / structure that may change for non-behavioral reasons.
6. ARIA attributes used as selectors are part of the component's contract — removing them in production code should fail tests, signaling either a regression or an intentional contract change.

## Store Tests

1. Use `createPinia` per test; do not share global state.
2. Cover initial state, getter derivations, and state changes after action execution.
3. Actions that hit external APIs mock the relevant fetch function or `$fetch`.
4. Cover the error branch of each action; verify error state updates correctly.

## Mock & Stub Principles

1. Mock at the boundary (API, router, external services); do not mock internal logic.
2. Use `vi.mock()` or `vi.fn()`; don't pollute globals.
3. Reset mocks after each test (`vi.resetAllMocks()` or `afterEach`).
4. Don't mock the unit under test extensively just to make a test pass.

## Coverage

1. Coverage numbers are a health signal, not the goal; high coverage doesn't guarantee quality, low coverage is usually a warning.
2. Set a baseline coverage threshold (typically 80%) for core business logic — composables, utils, store actions.
3. If `vitest`'s `coverage` is configured, set sensible `thresholds` and enforce them in CI.
4. Don't write meaningless tests just to hit a number; cover edge cases and error branches first.

## Snapshot Tests

1. Snapshots fit **stable, output-centric** scenarios — fixed-format data transforms, static component structure.
2. **Avoid** broad snapshot use on complex UI components:
   - Any class or HTML tweak triggers snapshot failures and meaningless updates.
   - Developers tend to run `--update-snapshots` without reviewing the diff.
3. If using snapshots, give them a clear `describe` purpose and audit them periodically.
4. Prefer behavior assertions (`expect(button.disabled).toBe(true)`) over wholesale snapshot comparison.

## Anti-patterns

1. Tests that verify implementation detail rather than behavior.
2. Tests that fail on UI tweaks (class names, HTML structure changes) without a real regression.
3. Importing and operating on store internals directly from tests.
4. Skipping error-branch tests; error state is part of quality.
5. Stacking many mocks to make a test pass — usually a sign the unit under test is overloaded.
6. Tests outside CI depending on external network or live environments.

## Output Requirements

When adding or reviewing tests, confirm:

1. The target is behavior, not implementation.
2. Async scenarios (loading, error, success) are all covered.
3. Mock scope is reasonable; not over-mocked.
4. Naming carries clear semantics; readers can infer the feature from the test list.
5. If tests get complex, flag possible over-burdening of the unit under test and suggest a split.
