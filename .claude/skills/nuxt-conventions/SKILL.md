---
name: nuxt-conventions
description: Nuxt 3 conventions — SSR / CSR boundary, page responsibility, data fetching (useAsyncData / useFetch / $fetch), middleware, plugin, SEO, error.vue, data lifecycle. Auto-load when editing pages / layouts / middleware / plugins / composables / server.
paths: app/pages/**,app/layouts/**,app/middleware/**,app/plugins/**,app/composables/**,app/server/**
---

# Nuxt Conventions

Apply these rules when working in Nuxt-managed directories.

> The app runs in SSR mode (`ssr: true`, Nitro preset `vercel`). All SSR / CSR boundary rules below are active.

## SSR / CSR Boundary

1. Every implementation must first identify its execution context (server / client).
2. Do not use `window`, `document`, `localStorage`, `navigator` in server context. Guard with `import.meta.client` or move to `onMounted` / event handlers.
3. `onMounted` is the earliest client-only lifecycle hook; it does not fire on the server.
4. Avoid hydration mismatch: server and client first render must produce identical markup. Don't read browser-only state at setup top-level — defer to `onMounted` or wrap UI in `<ClientOnly>`.
5. Treat user-specific runtime state (e.g. local persisted UI mode, combat tracker) as client-only; render placeholder server-side.

## Page Responsibility

1. Pages handle composition, data orchestration, and SEO / meta.
2. Pages don't carry low-level transport, mapping, or complex state detail.
3. If a page becomes heavy, extract a composable or data layer first.

## Data Fetching

1. `useAsyncData` provides automatic caching and key management; under SSR it runs server-side on first render and rehydrates on the client.
2. Use `useFetch` only when its semantics fit the call site.
3. Interaction-triggered requests prefer `$fetch`.
4. Avoid serial waterfalls; parallelize independent requests.
5. Don't let a single page juggle many disjoint fetch lifecycles.
6. Loading, error, and empty states must all be handled.
7. Page-transition loading needs explicit treatment (skeleton / spinner).

## API Contract

1. Request and response shapes come from `@rolling-dice-app/core`. Do not assume DB schema.
2. The backend is authoritative; frontend treats its responses as the contract truth.

## Server Routes

1. Anything that involves private logic, server-only config, or aggregation belongs in a server route.
2. Don't expose unsafe backend information to the frontend.
3. Server route responses should provide stable shapes.

## Middleware / Plugins

1. Middleware handles route guards, permission checks, and redirects — not full business flows.
2. Plugins are not a miscellaneous junk drawer.
3. `runtimeConfig` clearly separates `public` from server-only.

## SEO / Meta

1. SEO and meta concerns concentrate at the page layer.
2. Add `title`, `description`, `canonical`, OpenGraph as needed.
3. Do not scatter SEO logic across multiple layers.

## Error Page

1. Provide `error.vue` as the global error page covering 4xx / 5xx.
2. Differentiate by `error.statusCode`: 404 → guide back, 403 → explain permission, 500 → generic fallback.
3. `error.vue` never exposes stack traces, API paths, or internal server detail.
4. Use `clearError({ redirect: '/' })` to return users to a known good state.

## Data Lifecycle

1. To force a refetch on cached data, use `refreshNuxtData(key)`.
2. To clear cached data on leave or after a state change, use `clearNuxtData(key)`.
3. Don't call `refreshNuxtData` reflexively; rely on Nuxt's caching where it works.
4. When the same key is shared across routes, manage its lifecycle explicitly to avoid stale displays.

## Anti-patterns

1. Pages directly coupled to multiple raw API response shapes.
2. Middleware or plugins carrying unrelated responsibilities.
3. Ignoring server / client execution differences; using client-only data that breaks first-screen consistency.
