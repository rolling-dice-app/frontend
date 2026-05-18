---
name: review-conventions
description: Code review checklist — Vue / Nuxt / TypeScript / State / error handling / security / performance / accessibility / testing across nine review dimensions, plus risk-grading and minimal-fix-first output format. Auto-load when the user asks for review or refactor suggestions.
paths: app/**
---

# Code Review Conventions

When the user asks for a review, audit, or refactor proposal, prioritize the following dimensions.

## Vue Checks

1. Is the template overly complex?
2. Do props / emits carry semantics?
3. Are `computed` / `watch` used appropriately?
4. Is the component carrying too much responsibility?
5. Is there duplicated logic that should be extracted?

## Nuxt Checks

1. Is the SSR / CSR boundary clear?
2. Could this produce a hydration mismatch?
3. Is the data-fetching pattern appropriate?
4. Are page / layout / middleware / plugin responsibilities cleanly separated?
5. Is a client-only API being misused?

## TypeScript Checks

1. Is `any` being abused?
2. Are optional / nullable values handled safely?
3. Are DTO and UI model types being conflated?
4. Are there unsafe assertions?
5. Are type boundaries vague?
6. Are persistent / contract types being redeclared locally instead of imported from `@rolling-dice-app/core`?

## State Checks

1. Is the local state / composable / store boundary appropriate?
2. Is the store taking on too much responsibility?
3. Has one-off state been incorrectly promoted to global?
4. Is the state-update flow clear?

## Error Handling Checks

1. Does every fallible operation have an explicit error state?
2. Are loading / error / empty states all handled — no blank screens, no silent failure?
3. Are error messages meaningful to the user, without leaking technical detail?
4. Are error notifications routed through `useToast` (the single entry point) rather than scattered toast / alert calls?
5. Do form errors surface at the field level?
6. Is a frontend-preemptable check placed at the earliest user entry (so the
   user never enters a doomed flow), rather than only failing at submit? And
   conversely, are backend-authoritative failures left as post-action
   backstops rather than guessed at client-side? (See
   `error-handling-conventions` → Preemption placement.)

## Security Checks

1. Is `v-html` used without sanitization?
2. Is sensitive data (token, PII) stored in an unsafe location?
3. Do server routes validate input parameters?
4. Is the `runtimeConfig` public / private boundary correct?
5. Is any client-side surface leaking information it shouldn't?

## Performance Checks

1. Are there unnecessary re-renders (template calling a function instead of a `computed`)?
2. Are large or off-screen components lazy-loaded?
3. Do large lists have stable `:key`s, and have you considered virtual scrolling for large datasets?
4. Are high-frequency event handlers throttled?
5. Is first-screen data fetched server-side when SSR is in play?

## Accessibility Checks

1. Are interactive elements semantic HTML (`<button>`, `<a>`) rather than `<div>`?
2. Does every `<input>` have a corresponding `<label>`?
3. Do custom interactive components have full ARIA attributes?
4. Do components support keyboard operation?
5. Do images have `alt`, and do icon-only buttons have `aria-label`?

## Test Coverage Checks

1. Do new composables have corresponding unit tests?
2. Do new utils have complete pure-function tests?
3. Do store actions cover the error branches?
4. Do critical component interactions (props / emits) have component tests?

## Review Output Format

When delivering a review, prioritize:

1. Issue list
2. Risk levels
3. Minimal-fix proposals
4. Optional deeper-refactor directions

## Principles

1. Prioritize high-risk issues over a long list of low-value nitpicks.
2. Favor proposals that can land directly.
3. When multiple reasonable approaches exist, name the trade-offs.
4. Don't pretend there is only one correct answer.
