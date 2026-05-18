---
name: error-handling-conventions
description: Error handling conventions — differentiated error.vue, API errors (useAsyncData / useFetch / $fetch), HTTP-status mapping, form validation errors, centralized toast, three-state composable returns, Loading / Error / Empty. Auto-load when handling or reviewing error scenarios.
paths: app/**/*.vue,app/**/*.ts,app/pages/**/*.vue,app/composables/**/*.ts,app/server/**/*.ts
---

# Error Handling Conventions

Apply these rules when implementing, reviewing, or refactoring error-handling scenarios.

> The app runs in SSR mode (`ssr: true`, Nitro preset `vercel`). All error rules below — including server-route ones — are active.

## Core Principles

1. Error handling is part of the feature, not an afterthought.
2. Every fallible operation has an explicitly defined error scenario and corresponding behavior.
3. Users get clear feedback on every error path — no blank screens, no silent failures.
4. Error presentation (UI) and error handling logic (business) are clearly separated.

## Global Error Page

1. Use `error.vue` as the global Nuxt error page covering 4xx / 5xx errors.
2. `error.vue` differentiates by `statusCode`:
   - `404`: page not found; offer a path back to home.
   - `403`: no access; explain why and indicate the right action.
   - `500`: system error; do not expose technical detail; offer contact or retry.
3. Use `clearError` so users can recover from the error page.
4. `error.vue` does not expose stack traces, API paths, or server error detail.

## API Error Handling

1. API error responses use a unified handling pattern; do not reinvent it in each page or component.
2. `useAsyncData` / `useFetch` `error` refs must be handled explicitly — not silently ignored:

   ```ts
   const { data, error, status } = await useAsyncData('key', fetcher)

   if (error.value) {
     // Handle explicitly, not just console.log
   }
   ```

3. `$fetch` calls go inside try / catch with status-specific handling:
   - `400`: client input issue; reflect in the form UI.
   - `401`: needs auth; redirect to login or trigger refresh-token flow.
   - `403`: no permission; show a clear message — no silent redirect.
   - `404`: resource missing; provide a sensible degradation.
   - `422`: validation error; parse the response body and map to field-level errors.
   - `5xx`: system issue; show a generic error and offer retry.
4. Maintain a single error mapper that converts API error responses into a UI-friendly shape; do not parse error responses ad hoc.

## Notifications (Toast / Alert)

1. Backend mutation errors route through `useApiErrorToast().handle(err)` (single dispatcher; see "Mutation Error Routing" below). Frontend preemption messages, success / info toasts, and other UI feedback use `useToast()` directly.
2. `useToast` (`app/composables/ui/useToast.ts`) is the project's notification composable, a module-level singleton.
3. Error messages are meaningful to users — do not show raw HTTP status codes, backend codes, or technical messages.
4. Transient errors (e.g., network timeout) use toast; decision-requiring errors (e.g., overwrite confirmation) use dialog.
5. Success, warning, and error messages are visually and semantically distinct.

## Mutation Error Routing

This project deliberately **decouples user-facing error messages from backend error codes**.

### Principle

- **Frontend-preemptable** — input limits and UI-state limits that the frontend can reliably check before the request leaves (already-learned, attune cap, carry cap, file size / MIME, etc.). Block the action at the UI layer with a specific, localized message; **do not** send the request.
- **Backend-only** — anything that requires server-side authority (auth, schema, concurrency, system anomalies, bypass attempts). The user gets a single generic system message; the engineer gets a structured log.

If you find yourself maintaining a backend `code → message` dictionary on the frontend, you are probably substituting server feedback for frontend preemption. Push the check upstream.

### useApiErrorToast — what it does, what it doesn't

`useApiErrorToast` (`app/composables/ui/useApiErrorToast.ts`) is a single-purpose dispatcher: every backend `FetchError` (or any unknown error) yields

- toast: `t('ui.message.systemError')`
- log: `logger.error('[unhandled API error]', { code, status, url, err })`

It does **not** parse backend codes, dispatch recovery callbacks, branch by HTTP status, or accept a namespace / fallback / recovery option. The signature is `handle(err: unknown): void`.

```ts
const apiErrorToast = useApiErrorToast()

try {
  await api.doThing()
} catch (err) {
  apiErrorToast.handle(err)
}
```

If the failure needs a recovery side effect (e.g. refetch a slice to resync optimistic state), the caller triggers it **in parallel** with `handle()`, unconditionally — it does not depend on parsing the error:

```ts
for (const r of results) {
  if (r.status === 'rejected') apiErrorToast.handle(r.reason)
}
if (results.some((r) => r.status === 'rejected')) {
  await slice.refetch().catch(() => {})
}
```

### Channel decision

| Source of failure                           | Channel                                           |
| ------------------------------------------- | ------------------------------------------------- |
| Uncaught / page-level                       | `error.vue`                                       |
| Initial GET (page or component three-state) | `useAsyncData` status + three-state UI            |
| Frontend-preemptable rule violation         | Block at UI + `useToast().error()` with specifics |
| Backend `FetchError` from a mutation        | `useApiErrorToast().handle()`                     |
| Success / informational                     | `useToast().success() / .info()`                  |

### Do NOT route through `useApiErrorToast`

- Frontend preemption — emit the specific message at the UI block; no request goes out.
- Success or info toasts.
- 401 from `apiFetch` — handled by the fetch interceptor (auth store cleanup + redirect).

### Adding a new failure scenario

1. Can the frontend reliably know the answer before sending the request? If yes → add preemption logic in the relevant composable / component; add the user-facing string under the matching domain namespace (`spell.*`, `inventory.*`, `character.*`, …) — **not** under `ui.message.*`.
2. Is recovery (refetch / re-sync) appropriate after this failure? → trigger it in the caller, unconditionally, in parallel with `apiErrorToast.handle()`. Do **not** add a backend-code branch to the dispatcher.
3. Anything else → no change; it falls through to `systemError` + log.

### Preemption placement — hoist to the earliest gate

A frontend-preemptable check belongs at the **earliest UI affordance the user
would otherwise act through**, not at the final submit. If the condition is
already knowable before the user invests effort (navigating into a form, filling
fields, opening a flow), block there — the user must never enter a flow that is
already doomed.

- The plan-limit on character creation is knowable on the list page from
  `authStore.limits` + the loaded list. Block at the "add" entry
  (`pages/character/index.vue` → `toast.error` + no `navigateTo`), **not** at
  `build.vue` submit. Submit-time backend rejection stays only as the backstop
  for what the client genuinely cannot know (e.g. `maxCharacters` including
  soft-deleted rows).
- Collection limits (`ItemList`, `AttackList`, `FeaturesTab`,
  `SpellBookPanel`, `CharacterCampaignsTab`) already follow this — the guard sits
  on the add action, not on form save.

Corollary: do not "fix" a backend-authoritative failure by adding a speculative
client guard. If the client cannot reliably know the answer (auth, concurrency,
soft-deleted totals, races), it stays a post-action backstop via
`useApiErrorToast().handle()`. Hoisting applies only to genuinely
client-knowable preconditions.

### Anti-patterns

- Adding a backend `code → message` lookup dictionary to the frontend instead of preempting the rule.
- Parsing HTTP status in callers to branch UI behavior (treats transport-layer signal as application semantics).
- Showing a backend error code or its server-side message verbatim to the user.
- Catching a `FetchError` to swap it for a friendlier `throw` (`useApiErrorToast` already does the friendly UX; rethrowing only loses the FetchError shape).

## Form Validation Errors

1. Form validation has two layers — keep them separate:
   - **Frontend validation**: instant feedback, prevents unnecessary API calls.
   - **Backend validation**: API returns `422` or `400`; map back to field-level errors.
2. Backend field errors map to the corresponding `<input>`, not just a banner at the top of the page.
3. Multi-field errors display together; don't surface one error at a time.
4. Validation pass / submitting / submission failed are three visually distinct UI states.

## Composable Error Handling

1. Async operations inside a composable return an `error` state for the caller to render.
2. Composables don't decide presentation (don't call toast inside).
3. Recommended return shape:
   ```ts
   return {
     data,
     error, // Ref<Error | null>
     status, // Ref<'idle' | 'pending' | 'success' | 'error'>
     execute,
   }
   ```
4. If the composable needs side effects (e.g., toast), expose a callback or event for the caller.

## Runtime Error Handling

1. Every API call considers network interruption, timeout, and unexpected response.
2. Initial page-load API failure has a complete degradation path — never a blank page. Under SSR, `useAsyncData` errors should be surfaced through the page's three-state UI; never let an SSR fetch error reach `error.vue` for an otherwise-recoverable case.
3. Consider Vue's global `errorHandler` or Nuxt's `vue:error` hook as a final safety net for uncaught errors.

## Server Route Error Handling

1. Server routes use `createError` for semantic HTTP errors:
   ```ts
   throw createError({ statusCode: 404, statusMessage: 'Resource not found' })
   ```
2. Don't silently swallow errors and return a malformed data shape.
3. Server-route error messages exclude stack traces and internal server detail.
4. External API failures have an explicit fallback or error-code translation.

## Loading / Error / Empty State

Every data-driven UI block handles three states:

| State       | Requirement                                        |
| ----------- | -------------------------------------------------- |
| **Loading** | Skeleton or spinner; avoid layout shift (CLS).     |
| **Error**   | Clear error message with a retry entry point.      |
| **Empty**   | Explicit empty-state message — not a blank canvas. |

Missing any of the three counts as incomplete implementation.

## Anti-patterns

1. Silently swallowing errors (empty catch, or `console.error` only).
2. Showing the backend's technical error message directly to end users.
3. Scattering error handling across template, composable, store, and page with no unified pattern.
4. Folding loading / error / data branches into a tangled conditional tree in the template.
5. Leaving the page stuck in loading state with no user feedback on error.
6. Letting `error.vue` expose any internal system information.

## Output Requirements

When implementing or reviewing error handling, confirm:

1. Every fallible operation has an explicit error state.
2. Loading / error / empty are all handled.
3. Error messages are meaningful and don't leak system detail.
4. Error presentation logic is centralized.
5. Server-route errors return a unified shape.
