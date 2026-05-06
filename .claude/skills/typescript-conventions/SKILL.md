---
name: typescript-conventions
description: TypeScript type design conventions — avoid `any`, layer DTO / Response / Model, safe narrowing, naming conventions (XxxDto / XxxResponse / XxxViewModel). Auto-load when editing .ts / .tsx / .vue files or designing type boundaries.
paths: app/**/*.ts,app/**/*.tsx,app/**/*.vue
---

# TypeScript Conventions

Apply these rules when writing or reviewing TypeScript in this repo.

## Core Principles

1. Types are part of the design boundary, not an afterthought.
2. Prefer types that model the real business shape over loose object shapes.
3. Do not use `any` to escape a design problem.
4. Do not use assertions to fake safety.

## Cross-Repo Type Origin

Persistent domain types, request / response DTOs, and shared enumerations come from `@rolling-dice-app/core`. **Do not redeclare these locally.** Local types in this repo cover UI-only concerns: form state, view models, derived display shapes, and frontend-only domain (dice history, navigation, etc.).

If a type starts to look like something the backend would also need, it belongs in the `types` repo, not here.

## Type Design

1. Prefer explicit `interface` / `type`.
2. Distinguish DTO, response, domain model, and UI model when the distinction matters.
3. Optional and nullable fields must be handled explicitly.
4. If a value can be absent, reflect that explicitly in the type.

## Safety

1. Avoid unsafe `as unknown as ...`.
2. Preserve narrowing flow; don't shortcut it with assertions.
3. Treat external data sources as untrusted.
4. Do not let function return types be loosely typed.

## Vue / Nuxt

1. Props types must be accurate.
2. Emits payload types must be accurate.
3. Composables return a stable, typed shape.
4. API data passes through type constraints or mapping before reaching UI.

## Naming

1. DTOs: `XxxDto`.
2. API responses: `XxxResponse`.
3. Domain models: `Xxx`.
4. UI-specific models: `XxxViewModel` or the project's established convention.
5. Frontend-local form / draft shapes: `XxxFormState` or `XxxDraft`.

## Anti-patterns

1. Heavy use of `Record<string, any>`.
2. Making every field optional to avoid declaring intent.
3. Treating unverified external data as a trusted type.
4. Trading type integrity for short-term speed.
5. Locally redeclaring a type that already exists in `@rolling-dice-app/core`.
