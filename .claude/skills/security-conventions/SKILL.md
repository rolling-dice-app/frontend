---
name: security-conventions
description: Frontend security conventions — XSS protection (v-html sanitize), sensitive data boundaries (token / PII / API key), runtimeConfig public / private, server-authoritative auth, server-route input validation. Auto-load when handling input / output, auth, or external resources.
paths: app/**/*.vue,app/**/*.ts,app/server/**/*.ts,app/composables/**/*.ts,app/plugins/**/*.ts
---

# Security Conventions

Apply these rules whenever the work touches input / output, authentication, configuration, or external resources.

> ⚠️ The current MVP runs in SPA mode (`ssr: false`). CSR security rules are the active standard; server-route rules are forward-looking.

## Core Principles

1. Treat all external input as untrusted by default — API responses, URL parameters, user input.
2. Security problems are usually unfixable after the fact; prevent them at design and implementation time.
3. Apply least privilege: code accesses only the resources it actually needs.
4. Sensitive data must not appear anywhere a user or external observer can see it.

## XSS Protection

1. **Do not** use `v-html` without strict sanitization.
2. When rendering HTML content (e.g., CMS rich text), sanitize first:
   - Allow only a whitelist of tags and attributes.
   - Strip all `<script>`, `on*` event attributes, and `javascript:` protocols.
3. User-generated content (UGC) must be sanitized server-side; do not rely on client-side sanitization alone.
4. Avoid building HTML strings dynamically and inserting them into the DOM.
5. Prefer `innerText` / `textContent` over `innerHTML`. Vue's `{{ }}` interpolation auto-escapes — use it.

## Sensitive Data Handling

1. The following data must **not** appear in the listed locations:

   | Sensitive data                     | Forbidden location                              |
   | ---------------------------------- | ----------------------------------------------- |
   | Auth token / session               | `localStorage` (use HttpOnly cookie)            |
   | Personally identifiable info (PII) | URL query string, `console.log`, error messages |
   | API keys / secrets                 | Client-side bundle, `runtimeConfig.public`      |
   | Passwords                          | Client state, logs, any non-encrypted transport |

2. `runtimeConfig` boundaries:
   - `runtimeConfig.public` — only public-safe configuration (GA ID, API base URL).
   - `runtimeConfig` (non-public) — server-only secrets, **never** accessed from the client.
3. Don't store access tokens in Pinia stores or Vue reactive state; use server-side cookies.
4. `console.log` must not contain tokens, user PII, or full API responses (especially in production).

## SPA / CSR Security (Active)

1. SPA calls external services; auth tokens are passed via the Authorization header.
2. Token storage prefers HttpOnly cookies; if not possible, use memory-only storage and avoid `localStorage`.
3. With no server route, all sensitive logic lives behind the backend API; the client cannot trust its own permission checks.
4. CORS is configured on the backend; the frontend manages the API base URL safely via `runtimeConfig.public`.

## Authentication & Authorization

1. Client-side auth state is for UI presentation only; it is not a security boundary.
2. Nuxt middleware auth checks are UX-oriented (fast redirects); they do not replace backend authorization.
3. (Future, once SSR is enabled):
   - Final auth verification happens server-side.
   - Every authorized server route independently verifies the requester's identity; do not trust a client-supplied user ID.
4. With JWT, verification logic runs on the backend; do not decode and self-evaluate permissions on the client.

## Server Route Security (Future, Once SSR is Enabled)

1. Every server route validates all input (body, query, params); do not trust client-supplied data.
2. Use schema validation (e.g., `zod`) on request bodies:
   ```ts
   const body = await readValidatedBody(event, schema.parse)
   ```
3. Don't pipe client-supplied parameters directly into database queries or shell commands (SQL / command injection risk).
4. Response data includes only the necessary fields; do not return full DB rows or raw models.
5. When calling external APIs, attach API keys server-side; never pass them through the client.

## Dependency Security

1. Before adding a package, verify:
   - Maintenance status (last update, issue volume).
   - Known CVEs (`npm audit`).
   - Source authenticity.
2. Don't load third-party scripts from untrusted CDNs or unverified sources.
3. When introducing third-party scripts (chat widgets, ads), evaluate whether CSP is needed.

## Anti-patterns

1. `eval()`, `new Function()`, or `setTimeout(string)` on the client.
2. Server-only logic or configuration placed in `plugins/`, `composables/`, or other client-accessible areas.
3. APIs returning more data than the frontend needs (over-fetching that exposes sensitive fields).
4. Trusting `referer` / `origin` as the sole CSRF protection.
5. Returning stack traces, DB structure, or internal paths in error messages.
6. Shipping development debug info or mock endpoints to production.

## Output Requirements

When reviewing or implementing security-sensitive work, confirm:

1. Every `v-html` use has sanitization.
2. Sensitive data is not stored in unsafe locations.
3. Server routes validate input.
4. `runtimeConfig` public / private boundaries are correct.
5. The client surface does not leak anything it shouldn't.
