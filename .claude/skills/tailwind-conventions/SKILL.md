---
name: tailwind-conventions
description: Tailwind v4 conventions — @theme token layering (`--rui-*` vs `--rd-*`), class ordering, responsive, state styling, `@apply` extraction strategy, dark mode. Auto-load when editing class-bearing .vue / .tsx / .jsx files or files under components/.
paths: app/**/*.vue,app/**/*.tsx,app/**/*.jsx,app/components/**/*.ts,app/components/**/*.vue,app/pages/**/*.vue,app/layouts/**/*.vue
---

# Tailwind Conventions

Apply these rules when working with Tailwind CSS in this repo.

## Core Principles

1. Prefer Tailwind utility classes for styling; do not default back to custom CSS.
2. Optimize for readability, maintainability, and consistency — don't trade clarity for "everything as classes".
3. Use the existing design vocabulary and spacing scale; don't invent sizes ad hoc.
4. Components of the same kind keep consistent class structure and interaction-state patterns.
5. Don't stack utility classes when there's no clear value.
6. Tailwind exists to improve dev velocity and visual consistency, not to shorten CSS for its own sake.

## Usage Principles

1. If utility classes can solve it directly, use them directly.
2. If a class string is too long, repetitive, or unrecognizable, consider extracting a component, `@apply`, or a composition strategy.
3. State-driven styles keep the class composition logic clear; don't make templates unreadable.
4. Style follows component responsibility; don't blend visual logic with business logic.
5. Long classes alone aren't a reason to extract; weigh repetition, stability, and responsibility boundaries first.

## Tailwind v4 & @theme

### Setup

This project uses Tailwind v4; there is no `tailwind.config.ts`. Tailwind is loaded via `@import 'tailwindcss'` in CSS files; design tokens are defined in `@theme {}` blocks.

### Token Prefixes & Layering

1. The UI library (`packages/ui/`) uses the `--rui--` prefix; tokens are maintained by the library.
2. The app (`app/`) uses the `--rd--` prefix (double-dash separates the namespace from the token name); tokens are maintained at the application layer.
3. The two token systems are **fully separated**; do not mix prefixes.
4. The app may consume `--rui--*` tokens (from the UI library's CSS) but **must not add** `--rui--*` tokens.
5. App-specific style additions (brand colors, page-level spacing) are defined as `--rd--*` tokens in `app/assets/css/color.css`.

### @theme Usage

1. CSS custom properties defined inside `@theme {}` automatically register as Tailwind utility values.
2. Raw `--rd--*` tokens are mapped into Tailwind's `--color-*` namespace via a single `@theme inline` block in `app/assets/css/main.css`. Names are aliased to avoid awkward utilities (`--rd--color-bg` → `--color-canvas` so you write `bg-canvas`, not `bg-bg`; `--rd--color-text` → `--color-content` so you write `text-content`).
3. Suggested token layering:
   - **Semantic layer**: surface, text, border — generic UI vocabulary.
   - **Component layer**: card, modal, drawer — element-specific tokens.
4. New tokens follow the existing naming and layering. Define the raw token in `color.css`, then add the `@theme inline` mapping in `main.css` so it becomes a utility class.

### Token Consumption

1. **Default path — Tailwind utilities via the `@theme inline` aliases.** Use the mapped names directly:
   ```html
   <div class="bg-canvas text-content border border-border">
     <button class="bg-primary hover:bg-primary-hover text-content-inverse">…</button>
   </div>
   ```
2. **Raw token via `var()`** — only when passing color values into a UI-library component prop or writing a custom CSS rule that the utility layer can't express:
   ```html
   <UiDrawer bg-color="var(--rd--color-panel)" text-color="var(--rd--color-text)" />
   ```
3. Do not write `bg-(--rd--color-primary)` style arbitrary references when an `@theme inline` alias exists — use the alias.
4. Prefer existing tokens over new arbitrary values. If the same arbitrary value appears in multiple places, add a token to `color.css` and an alias to `main.css`.

### Dark Mode

1. Override `:root` variables under the `.dark` class; components don't conditionally branch.
2. Components consume tokens; dark mode switches automatically via CSS variables.

### Anti-patterns

1. Hardcoding `oklch` (or any other) color values in components; use tokens instead.
2. Defining global design tokens outside `color.css` / `@theme`.
3. Bypassing the token system with arbitrary color values.
4. Defining `--rui--*` tokens in the app or `--rd--*` tokens in the UI library.
5. Writing `bg-(--rd--color-*)` arbitrary references when the `@theme inline` alias (`bg-primary`, `bg-canvas`, etc.) already exists.
6. Single-dash prefix typos (`--rd-color-*` / `--rui-color-*`) — the namespace separator is a double dash.

## Class Ordering

Suggested ordering for consistency and readability:

1. layout: `block`, `flex`, `grid`, `hidden`
2. positioning: `relative`, `absolute`, `sticky`, `top-*`, `left-*`
3. box model: `w-*`, `h-*`, `min-w-*`, `max-w-*`, `p-*`, `px-*`, `py-*`, `m-*`, `gap-*`
4. border / radius / background: `border`, `border-*`, `rounded-*`, `bg-*`
5. typography: `text-*`, `font-*`, `leading-*`, `tracking-*`
6. effects: `shadow-*`, `opacity-*`
7. interaction: `transition-*`, `duration-*`, `ease-*`, `hover:*`, `focus:*`, `active:*`, `disabled:*`, `aria-*`

Not enforced strictly — but stay reasonably consistent.

## Responsive Design

1. Mobile-first by default.
2. Add responsive classes only when needed; don't stack them mechanically.
3. If a single element accumulates many breakpoint rules, the layout may be too complex.
4. Responsive differences should be reflected in structure and responsibility, not patched in ad hoc.
5. When responsive rules harm readability, split structure, extract a child component, or rethink layout responsibilities.

## State Styling

1. `hover`, `focus`, `active`, `disabled`, `aria-*` follow consistent patterns.
2. State classes shouldn't be unreadable; if they get unwieldy, organize them as a named computed class.
3. Multi-state components map state to classes in a readable way — not via stacked conditionals in the template.
4. `disabled` covers both visual and interaction blocking.
5. State styling matches behavior; don't apply visual changes that don't reflect actual interaction semantics.

## Style Extraction Priority

When styling becomes complex, evaluate extraction in this order:

1. For light conditional toggling, organize as a readable `computed` class or helper.
2. If the same utility class set repeats across multiple places with stable semantics, consider `@apply`.
3. If repetition includes structure, state, interaction, or variant logic — extract a component first.
4. If variation is mostly variant composition rather than full structural repetition, consider variant mapping.
5. If extraction makes the style source harder to trace, keep the explicit utility classes.

## `@apply` Usage

1. When utility class strings get long and have a clear reuse case, suggest extracting via `@apply`.
2. Conditions for `@apply`:
   - Stable style semantics.
   - Multiple repeats.
   - Limited dynamic dependencies.
   - Improves readability and consistency once extracted.
3. Long but single-occurrence or context-heavy classes shouldn't be force-extracted just to look shorter.
4. If the styling spans structure, state, size, variant, and business differences — consider component, variant mapping, or helper rather than `@apply`.
5. `@apply` exists to improve reuse, consistency, and readability — not to hide long class strings.
6. Don't let `@apply` replace clear, direct utility usage; use it only when repetition and maintenance cost are real.
7. If style differences come mostly from responsive rules, state conditions, or dynamic composition, keep utility classes explicit.

## Conditional Classes

1. Light conditional logic is fine inline in the template.
2. Complex conditional logic moves into `computed` or helpers.
3. Don't let `:class` become a giant conditional engine.
4. Object form and array form are both fine; readability decides.
5. When class composition becomes a comprehension barrier, organize as named logic — don't keep expanding the template.

## Component-ization

1. Repeated class patterns across multiple sites prefer extraction into a shared component over copy-paste.
2. Don't extract pure-style wrappers prematurely; verify reuse first.
3. Once a class pattern is reliably repeated and the variant rules are clear, consider:
   - Base component
   - Variant mapping
   - Helper function
4. When style repetition co-occurs with structural repetition, prefer component extraction over class extraction alone.

## Boundary with Custom CSS

1. Custom CSS is acceptable for:
   - Animations Tailwind can't express cleanly.
   - Third-party component overrides.
   - Rare but high-frequency repetition where utility expression is too long.
2. Don't fall back to scoped CSS by personal habit.
3. Custom CSS keeps single responsibility and doesn't fight utility classes.
4. Custom CSS is supplementary — not the default path.

## Arbitrary Values

1. Prefer existing Tailwind spacing, size, color, radius, shadow tokens.
2. Use arbitrary values only when neither the design nor existing tokens express the need cleanly.
3. If the same arbitrary value repeats, evaluate whether it represents a missing token or extractable style.
4. Don't use arbitrary values as a quick patch hiding structural or layout problems.
5. Arbitrary values are exceptions, not the norm.

## Design Consistency

1. Spacing, font size, radius, and shadow stay aligned with the existing design scale.
2. Color, interaction, disabled, and warning vocabulary stay consistent across the project.
3. Don't mix multiple button / card / input styles arbitrarily.
4. Style edits consider whether they break existing UI consistency.
5. New visual vocabulary requires a real design need, not a local quick fix.

## Vue / Nuxt Tips

1. Template classes stay readable; don't let visual styling obscure structure.
2. If a component's classes get long enough to harm comprehension, extract a child component.
3. Pages don't accumulate fine-grained styling; complex UI lives in child components.
4. Style composition unrelated to business logic stays in the presentation layer.
5. If a component's main responsibility shifts away from presentation, it shouldn't simultaneously coordinate large amounts of styling detail.

## Anti-patterns

1. Stacking unreadable amounts of utilities on a single element.
2. Dumping complex conditional class logic directly into the template.
3. Quick fixes that introduce conflicting classes.
4. Mixing large amounts of Tailwind with large amounts of scoped CSS.
5. Unbounded use of arbitrary values (`w-[237px]`, `mt-[13px]`) without a clear design reason.
6. Adding new colors, sizes, or shadow styles without a design system basis.
7. Styling tricks that mask structural problems; fix component boundaries and layout responsibility instead.
8. Using `@apply` as a universal long-class hider.
9. Ignoring long-term maintenance cost because Tailwind makes stacking fast.

## Output Requirements

When generating or refactoring Tailwind code:

1. Clear class structure.
2. Consistent state styling.
3. Reasonable responsive strategy.
4. Avoid excessive verbosity.
5. When appropriate, suggest splitting components, organizing class composition, or extracting `@apply`.
