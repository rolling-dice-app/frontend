---
name: performance-conventions
description: Performance optimization conventions — defineAsyncComponent / Lazy, parallel fetching, bundle size and tree-shaking, NuxtImg, virtual scrolling, Web Vitals (LCP / INP / CLS / TTFB), measurement tools (Lighthouse / nuxt analyze). Auto-load when handling performance issues or tuning nuxt.config.
paths: app/**/*.vue,app/**/*.ts,app/pages/**/*.vue,app/components/**/*.vue,app/composables/**/*.ts,nuxt.config.ts
---

# Performance Conventions

Apply these rules when implementing, reviewing, or refactoring performance-sensitive scenarios.

> The app runs in SSR mode (`ssr: true`, Nitro preset `vercel`). All performance rules below — including SSR-specific ones (TTFB, hydration cost) — are active.

## Core Principles

1. Performance optimization presumes correctness and maintainability; don't trade readability for micro-optimization.
2. Prioritize user-perceived performance issues (first paint, interaction latency) over abstract numbers.
3. Don't preemptively over-optimize when there's no observed problem.
4. Every optimization is backed by an observable signal (Lighthouse, LCP, INP, bundle size report, etc.).

## Component Loading Optimization

1. Non-first-screen components use `defineAsyncComponent` for async loading:
   ```ts
   const HeavyChart = defineAsyncComponent(() => import('./HeavyChart.vue'))
   ```
2. Nuxt's `Lazy` prefix turns a component into a lazy import:
   ```html
   <LazyHeavyComponent v-if="visible" />
   ```
3. Don't statically import heavy components into a layout or a high-frequency render path.
4. Client-only third-party widgets must be wrapped in `<ClientOnly>` to avoid hydration mismatch under SSR.

## Route & Page Loading

1. Nuxt code-splits pages automatically; no manual page-splitting needed.
2. Before navigation, `prefetchComponents` or `preloadComponents` can manually control preloading.
3. Don't import page-specific heavy dependencies in `app.vue` or `layouts/default.vue`.

## Data Fetching Performance

1. When a page needs multiple data sources, use `Promise.all` or multiple parallel `useAsyncData` calls — not serial waits.
2. Use `getCachedData` so re-entering a page doesn't refetch existing data:
   ```ts
   useAsyncData('key', fetcher, {
     getCachedData: (key, nuxtApp) => nuxtApp.payload.data[key],
   })
   ```
3. Push `useAsyncData` to complete first-screen fetches on the server (SSR), reducing client waterfall and improving LCP.
4. Server routes can attach HTTP cache headers for CDN caching of static or low-update-rate data.

## SSR Performance Highlights

1. First-screen HTML ships server-rendered; LCP target is fast TTFB plus minimal render-blocking on the client.
2. Bundle size still matters for hydration cost (TBT / INP); route-level code splitting plus `LazyXxx` for off-screen components is the baseline.
3. First-screen data goes through `useAsyncData` so it completes server-side and ships in the SSR payload — avoid post-mount client fetches for above-the-fold content.
4. Loading skeletons remain the primary user-perceived lever for any client-only / lazy-loaded section.
5. Watch the SSR payload size: `useAsyncData` results serialize into the HTML; trim with `transform` to expose only what the page needs.

## Bundle Size Management

1. Before adding a dependency, verify it's actually needed and check its size (via `bundlephobia.com`).
2. For tree-shaking-friendly packages, use named imports — not whole-module imports:
   ```ts
   // Good
   import { format } from 'date-fns'
   // Avoid
   import * as dateFns from 'date-fns'
   ```
3. Use `nuxt analyze` (or `vite-bundle-visualizer`) periodically to inspect bundle composition.
4. Large utility libraries (e.g., lodash) should use the ESM version (`lodash-es`) under Nuxt 3 / ESM.

## Image & Static Asset Optimization

1. Use Nuxt Image (`@nuxt/image`) for image handling — automatic format conversion (WebP / AVIF), lazy loading, responsive sizing.
2. Use `<NuxtImg>` instead of native `<img>`:
   ```html
   <NuxtImg src="/hero.jpg" width="800" height="400" loading="lazy" />
   ```
3. LCP-relevant images use `loading="eager"` or `fetchpriority="high"` — not lazy.
4. Don't put large images or video directly into `assets/`; use a CDN or object storage.
5. For many SVG icons, use an inline sprite or icon component; avoid duplicate requests.

## Render Performance

1. Large list rendering keeps stable `:key`s to avoid unnecessary DOM rebuilds.
2. For large datasets (>500 items), consider virtual scrolling.
3. Cache expensive computations in `computed`; don't call functions directly in templates.
4. Avoid deep watchers (`{ deep: true }`) on large objects; use precise tracking instead.
5. If a component doesn't depend on reactive data, consider `v-once` for static rendering.

## Web Vitals

| Metric                            | Description                         | Priority Strategy                                                                                 |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------------------------------- |
| **LCP** Largest Contentful Paint  | First-screen main content load time | Image optimization (NuxtImg), reduce render-blocking, lower bundle size, SSR-streamed first paint |
| **INP** Interaction to Next Paint | Interaction response delay          | Avoid long tasks, reduce JS execution                                                             |
| **CLS** Cumulative Layout Shift   | Unexpected shift during page load   | Image dimensions, avoid dynamic insertion that affects layout, reserve skeleton space             |
| **TTFB** Time to First Byte       | Server response latency             | Server-route cache, Vercel edge / CDN, lean SSR data fetching                                     |

## Nuxt Specifics

1. Static-content pages can use `nuxt generate` or `routeRules` `prerender` to pre-render and avoid recompute on every SSR request.
2. With Nuxt Middleware, ensure no high-latency operations (e.g., unnecessary API calls).
3. Use `useRequestEvent` or `cachedFunction` (Nitro) to add a cache layer to server functions.
4. Watch payload size; don't over-serialize data from server to client. Trim `useAsyncData` `transform` to expose only what the page needs.

## Measurement Tools

Before any performance work, confirm the root cause via tools rather than guessing:

1. **Lighthouse** (Chrome DevTools) — Web Vitals (LCP, INP, CLS, TTFB).
2. **Chrome Performance panel** — Long Tasks, JS execution, re-render causes.
3. **Vue DevTools** (Profiler tab) — component render counts, render duration, props change source.
4. **`nuxt analyze`** — bundle composition; identify heavy dependencies.
5. **Network panel** — first-screen resource order, waterfall bottlenecks, duplicate requests.

Discipline: measure first, optimize, then measure again.

## Anti-patterns

1. Sync-heavy computation inside `mounted` that blocks render.
2. High-frequency event handlers (`scroll`, `resize`, `mousemove`) running expensive work directly; use throttle or `requestAnimationFrame`.
3. Templates calling uncached methods for complex computation; switch to `computed`.
4. Running client-only performance optimizations (e.g., intersection observer) in SSR context without a guard (SSR only).
5. Sacrificing readability for a performance number — performance must be measured, not guessed.

## Output Requirements

When delivering performance work:

1. Identify the likely root cause (not a guess).
2. Propose the smallest workable improvement.
3. Describe the observable improvement after the change.
4. When multiple options exist, name the trade-offs.
5. For architecture-affecting changes, combine with the smallest-change principle and propose a stepwise plan.
