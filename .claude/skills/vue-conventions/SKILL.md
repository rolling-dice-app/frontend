---
name: vue-conventions
description: Vue SFC conventions — `<script setup>`, props / emits / slots, computed vs watch, defineModel, provide / inject, component responsibility, basic accessibility. Auto-load when editing .vue files.
paths: app/**/*.vue
---

# Vue Component Conventions

Apply these rules when writing Vue single-file components.

## Structure

1. Default to `<script setup lang="ts">`.
2. Keep templates readable; avoid deep nesting and long inline expressions.
3. Move complex logic into named `computed`, helper functions, or composables.
4. Recommended `<script setup>` ordering:
   - imports
   - types
   - props / emits
   - refs / reactive state
   - computed
   - watchers
   - methods / handlers

## Props / Emits / Slots

1. Props names carry semantics; don't over-abstract.
2. Emits express business intent, not raw DOM actions.
3. Slots have a clear responsibility boundary.
4. Don't design oversized props APIs for hypothetical reuse.

## Reactivity

1. Derived values prefer `computed`.
2. `watch` is for side effects, not as a default derivation tool.
3. Avoid unnecessary deep watchers.
4. Avoid over-nested reactive structures.

## Component Responsibility

1. Presentation components stay simple.
2. Container components may coordinate data, but not at the cost of taking on too many responsibilities at once.
3. If a component handles all of:
   - fetching
   - mapping
   - rendering
   - navigation
   - side effects

   split it.

## v-model on Custom Components

1. Custom form components implement two-way binding via `defineModel()` (Vue 3.4+) instead of manually defining `modelValue` prop and `update:modelValue` emit:
   ```ts
   const model = defineModel<string>()
   ```
2. For multiple v-models, use named `defineModel('visible')`.
3. v-model components keep semantics consistent with native inputs (emit only on actual value change, not on every render).
4. Don't load v-model components with business logic; keep them UI-only.

## provide / inject

1. `provide / inject` is for cross-multilevel-component data — avoid prop drilling.
2. Use a `Symbol` as the injection key together with a typed declaration:
   ```ts
   const ThemeKey: InjectionKey<Ref<string>> = Symbol('theme')
   ```
3. Don't use `provide / inject` to replace normal props / emits flow; the use case is layout-level configuration handed to deep descendants (theme, locale, form context).
4. Don't mutate the provided value from the `inject` side; expose a setter from the provider.

## Type Origin

Persistent domain types and DTOs used in templates come from `@rolling-dice-app/core`. Local types in `app/types/` are for UI-only concerns (form state, view models, navigation, etc.).

## Accessibility Baseline

1. Interactive elements use semantic HTML — don't simulate `<button>` with a `<div>`.
2. Icon-only buttons require `aria-label`.
3. Custom interactive components (modal, dropdown) provide ARIA attributes and keyboard support.
4. Live-updating notification regions get `aria-live`.
5. Detailed rules: see the `accessibility-conventions` skill.

## Types

1. Props, emits, and slots have complete types.
2. Avoid `any`.
3. Event payloads have explicit types.

## Anti-patterns

1. Long conditional expressions inside the template.
2. Treating raw API response shapes directly as UI models.
3. Extracting tiny components for theoretical reuse.
4. Mixing too much business flow logic into a component.
