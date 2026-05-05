---
name: pinia-conventions
description: Pinia store conventions — when to use a store, state / getter / action design, storeToRefs, async action loading / error handling, cross-store dependencies, anti-patterns. Auto-load when editing files in stores/ or any *store*.ts.
paths: app/stores/**,app/**/*store*.ts
---

# Pinia Conventions

Apply these rules when working with Pinia stores.

## When to Use a Store

1. Only state genuinely shared across components or pages goes into a store.
2. One-off page UI state stays in local state or a composable by default.
3. Do not promote ephemeral state to global state without justification.

## Store Design

1. A store focuses on a single domain or a clear responsibility.
2. Actions do not balloon into a generic service layer.
3. State shape is easy to update and easy to read.
4. Avoid mixing transport, mapping, toast, router, and UI side effects in one store.

## State / Getter / Action

1. State holds only the shared data that needs to be shared.
2. Derived values prefer `getter` or external `computed`.
3. Action names express intent.
4. Don't push every async flow into the store unnecessarily.

## Type & Data Boundaries

1. Store state types are explicit.
2. External data is mapped before entering the store; raw response shapes don't leak into state.
3. Persistent domain shapes used in stores come from `@rolling-dice-app/types`. Do not redeclare them in the store.

## storeToRefs

1. When destructuring reactive state or getters, use `storeToRefs` or you lose reactivity:
   ```ts
   const store = useCartStore()
   const { items, totalPrice } = storeToRefs(store) // reactive
   const { addItem, removeItem } = store // actions destructure plainly
   ```
2. Actions don't need `storeToRefs` — destructure directly.
3. If the whole store stays as an object, no destructuring is required.

## Async Action Design

1. Async actions update loading and error state explicitly. Callers should not have to guess execution status.
2. Pair state with `loading` / `error` fields:
   ```ts
   state: () => ({
     items: [] as CartItem[],
     status: 'idle' as 'idle' | 'pending' | 'success' | 'error',
     error: null as string | null,
   })
   ```
3. The `catch` branch updates error state — never silently swallow.
4. Actions don't call toast or router internally; they return a result and let the caller decide UI consequences.
5. Repeatedly invoked actions must consider race conditions on concurrent execution.

## Cross-Store Dependencies

1. If store A needs store B's data, call `useOtherStore()` inside the action or getter — don't establish the dependency at state initialization.
2. Avoid bidirectional dependencies (A→B and B→A); they signal a domain-boundary problem.
3. If cross-store wiring becomes complex, the boundary is wrong; redraw the domains.
4. Logic shared across stores often belongs in a composable, not in mutual store imports.

## Anti-patterns

1. One giant store collecting all loading / error state.
2. A store that becomes a shared dumping ground.
3. Page-only visual state living in a global store.
