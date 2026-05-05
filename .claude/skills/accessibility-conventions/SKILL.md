---
name: accessibility-conventions
description: Accessibility (WCAG AA) — semantic HTML before ARIA, form label / aria-describedby, dropdown / modal / tab ARIA attributes, keyboard operation, image alt, color contrast. Auto-load when editing .vue files or reviewing component accessibility.
paths: app/**/*.vue,app/components/**/*.vue,app/pages/**/*.vue,app/layouts/**/*.vue
---

# Accessibility Conventions

Apply these baseline accessibility requirements when implementing, reviewing, or refactoring UI components and pages.

## Core Principles

1. Accessibility is part of feature completeness, not a bonus.
2. Semantic HTML is the foundation; ARIA supplements semantic HTML rather than replacing it.
3. **Rule: if a native HTML element expresses the semantics, do not simulate it with `div` + ARIA.**
4. Every interactive component must support keyboard operation, not just mouse.

## Semantic HTML

1. Interactive elements use the corresponding native tag:
   - Trigger an action → `<button>`
   - Page navigation → `<a href="...">`
   - Data input → `<input>` / `<select>` / `<textarea>`
2. Don't use `<div>` or `<span>` to fake a button without sufficient ARIA support:
   ```html
   <!-- Avoid -->
   <div @click="submit">Submit</div>

   <!-- Correct -->
   <button type="button" @click="submit">Submit</button>
   ```
3. Page structure uses semantic block elements: `<header>`, `<main>`, `<nav>`, `<footer>`, `<section>`, `<article>`.
4. Heading levels (`<h1>` → `<h6>`) reflect information architecture; do not pick a level for visual sizing.

## Form Accessibility

1. Every `<input>` has a corresponding `<label>` linked via `for` / `id` or by wrapping.
2. Error messages associate to their input via `aria-describedby`:
   ```html
   <input id="email" aria-describedby="email-error" aria-invalid="true" />
   <p id="email-error" role="alert">Please enter a valid email.</p>
   ```
3. Required fields use `aria-required="true"` or the native `required` attribute.
4. Submitting state disables the button and surfaces the state to prevent double submission.

## ARIA on Interactive Components

1. Custom dropdown / select:
   - Trigger element: `aria-haspopup="listbox"` and `aria-expanded`.
   - Option list: `role="listbox"`; options: `role="option"`.
2. Custom modal / dialog:
   - Container: `role="dialog"` and `aria-modal="true"`.
   - Must include `aria-labelledby` pointing to the dialog title.
   - On open, focus moves into the dialog; on close, focus returns to the trigger.
3. Tabs:
   - Tab list: `role="tablist"`.
   - Each tab: `role="tab"` and `aria-selected`.
   - Content area: `role="tabpanel"` and `aria-labelledby`.
4. Loading states:
   - Use `aria-busy="true"` or `role="status"` to inform assistive tech.
   - Live-updating regions: `aria-live="polite"` (general) or `aria-live="assertive"` (urgent).

## Keyboard Operation

1. Every interactive element is reachable via `Tab`; tab order matches visual logic.
2. Buttons and links activate on `Enter`; buttons also activate on `Space`.
3. When a modal is open, focus is trapped inside it; the user cannot Tab to background elements.
4. Custom dropdowns support arrow keys (`↑` `↓`), `Enter` to select, `Escape` to close.
5. Don't remove the default focus outline; if you customize it, ensure visibility is at least as good as the browser default.

## Images & Media

1. Every `<img>` has an `alt` attribute:
   - Meaningful image: describe the content or function.
   - Decorative image: `alt=""` so assistive tech skips it.
2. `<NuxtImg>` requires `alt` the same way.
3. Icon-only buttons require text via `aria-label`:
   ```html
   <button aria-label="Close" @click="close">
     <IconX />
   </button>
   ```
4. If video content is present, provide captions or a transcript.

## Color & Vision

1. Text-to-background contrast meets at least **WCAG AA**:
   - Normal text: contrast ratio ≥ 4.5:1.
   - Large text (18px+ or bold 14px+): contrast ratio ≥ 3:1.
2. Don't convey state through color alone (e.g., red-only for error); pair with an icon or text.
3. Hover / focus states have visual feedback beyond color change.

## Vue / Nuxt Specifics

1. After route transitions, manage focus so assistive tech users know the page changed (handle via a `useRouter` hook).
2. `v-show` keeps elements in the DOM and Tab-reachable; for full hiding use `v-if` or pair with `tabindex="-1"`.
3. Dynamically loaded content (e.g., infinite scroll) notifies assistive tech via `aria-live` or focus management.
4. When using `Teleport` for a Modal, ensure the focus trap still works correctly.

## Anti-patterns

1. Using `<div>` / `<span>` to simulate interactive elements without proper ARIA.
2. Removing or overriding the focus outline without an alternative visual indicator.
3. Important information that is only available via mouse hover.
4. Dynamic content updates (toast, status changes) that are completely silent to assistive tech.
5. Breaking semantic HTML for visual layout (e.g., using `<h3>` because the size is right).
6. Skipping `<img>` `alt`, even for decorative images (use `alt=""`).

## Output Requirements

When implementing or reviewing UI components, confirm:

1. Interactive elements use semantic HTML or have complete ARIA support.
2. Every input has a label; error messages are tied via `aria-describedby`.
3. Interactive components support keyboard.
4. Images have appropriate `alt`.
5. Dynamic content updates use `aria-live` or focus management.
