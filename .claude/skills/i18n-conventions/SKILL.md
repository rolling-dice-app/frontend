---
name: i18n-conventions
description: i18n conventions — folder layout, t() with interpolation, union-key safety, naming, text style, review cues. Auto-load when editing .vue, store, composable, or message files.
paths: app/**/*.vue, app/**/*.ts
---

# i18n Conventions

Apply these rules whenever a user-facing string is added, moved, or changed. The product is **zh-TW only**; rules below assume single-locale and forbid migration to vue-i18n / @nuxtjs/i18n unless an explicit locale-expansion milestone is opened.

## Architecture

- Self-built infra at `app/i18n/index.ts` — exports `t(path, params?)`, `useI18n()`, `Locale`, `MessagePath`
- `LeafPath<T>` recursively flattens the message tree into a string-literal union of valid paths — TS rejects any unknown path at compile time
- Messages live in `app/i18n/zh-TW/`; one file per concern (no `enum/` subfolder)

**Do not** import `vue-i18n` or `@nuxtjs/i18n`. Self-built `t()` covers the entire need at zh-TW. Re-evaluation only when a second locale is committed to ship.

## Folder layout

```
app/i18n/
├── index.ts                # t / useI18n / Locale / MessagePath / InterpolationParams
└── zh-TW/
    ├── index.ts            # exports `zhTW` — the message tree root
    ├── ui.ts               # cross-domain UI (action / form / aria / error / message / state / nav / ...)
    ├── ability.ts          # AbilityKey enum
    ├── character.ts        # alignment / gender / size enum + character-domain UI
    ├── class.ts            # ClassKey / SubclassKey enum + class-domain UI
    ├── combat.ts           # damageType / featureSource / featureRecovery enum + combat-domain UI
    ├── inventory.ts        # armorType / itemType enum + inventory-domain UI
    ├── settings.ts         # settings page UI (no enum)
    ├── skill.ts            # SkillKey / ProficiencyLevel enum
    └── spell.ts            # SpellSchool enum + spell-domain UI
```

Tree root spreads each file into `zhTW`; call paths are `t('<file-key>.<...>')`.

### Two-track layout

- **`ui.*`** — cross-domain UI vocabulary. Never tied to one resource type.
- **`<domain>.*`** — everything scoped to one domain: enum (union → label) **and** that domain's UI (page titles, form labels, action verbs). Enum and UI may coexist in the same file as long as the enum portion follows the rule below.

`settings.ts` is the exception — page-specific UI with no enum. Other page-only files (login, etc.) follow the same shape.

### Adding a new domain

A new resource type (e.g. M7's `monster`, `battlefield`, `sessionLog`, `tag`) gets one new file `app/i18n/zh-TW/<domain>.ts` and one line in `app/i18n/zh-TW/index.ts`. Don't lump it into `ui.ts`.

### When to split `ui.ts`

`ui.ts` stays a single file until > 200 lines. Then split into `app/i18n/zh-TW/ui/<section>.ts` (action.ts / form.ts / error.ts / ...) with a barrel `ui/index.ts`. Tree-root path stays `t('ui.action.save')`.

## `t()` usage

```ts
import { t } from '~/i18n'

t('ui.action.save') // → '儲存'
t('ability.strength') // → '力量'
t('character.alignment.lawfulGood') // → '守序善良'
t(`spell.school.${school}`) // dynamic; school: SpellSchool
t('ui.error.attunedLimit', { max: 6 }) // interpolation: '已達同調上限 6 件'
```

### Interpolation (`{key}` placeholders)

```ts
// Message
export default {
  error: {
    attunedLimit: '已達同調上限 {max} 件',
    rateLimited: '操作過於頻繁，請於 {seconds} 秒後再試',
  },
}

// Call site
t('ui.error.attunedLimit', { max: 6 })
t('ui.error.rateLimited', { seconds: 30 })
```

Rules:

1. Placeholder name is **camelCase, single noun**: `{max}`, `{seconds}`, `{count}`, `{field}`.
2. When multiple placeholders appear in one message, names must be context-clear: `'從 {min} 到 {max}'` — not `'從 {a} 到 {b}'`.
3. Missing key at runtime → `t()` keeps `{key}` in output and logs a warning (dev-visible).
4. Extra params for messages without placeholders → silently ignored.
5. Param values pass through `String()`; no HTML escape is performed.

### Type safety on placeholders

Full type-safe placeholder inference (extracting `{key}` names from message body into the params type) was rejected — TS template-literal magic conflicts with `LeafPath` recursion and tanks IDE perf. Runtime warn + naming convention covers it.

## What goes through `t()`

**Use `t()` for:** UI text (labels, buttons, tooltips, placeholders, aria-labels), form validation messages, toast / modal text, empty state copy, auth messages, error toast (via `useApiErrorToast.ts`).

**Do NOT use `t()` for:**

- Backend-returned **data text** — `spell.name`, `character.name`, `user.displayName`, `feature.description`, `campaignRecord.title`, `item.name`. These are user-authored or SRD data, rendered as-is.
- Logger messages — `createLogger(...)`'s arguments stay raw English; logs are not user-facing.
- `app/mocks/*` — fixture data mimics backend payloads; keep Chinese as raw constants.

### Mixed scenes (verb + data)

For aria-labels combining a translated verb with backend data, use template literal interpolation at the call site. **Do not** decompose the data into i18n keys:

```vue
<button :aria-label="`${t('spell.prepare')} ${spell.name}`">
```

### `constants/*.ts` with user-facing labels

Move the label through i18n. The constant exports a key (union member); the component renders via `t()`:

```ts
// constants/dnd.ts
export const ABILITY_METHODS = ['custom', 'pointBuy', 'diceRoll'] as const
// component
{
  {
    t(`character.allocationMethod.${method}`)
  }
}
```

### Client-side form validation

Validation messages go in `ui.form.*` (cross-page) or `<domain>.<formContext>` if the message is domain-specific.

## Domain-file enum portion (type-safe lookup)

When a domain file holds a union → label map, use `Readonly<Record<UnionKey, string>>` with the union imported from `@rolling-dice-app/core`. This makes TS reject any missing or extra key.

```ts
// app/i18n/zh-TW/spell.ts
import type { SpellSchool } from '@rolling-dice-app/core'

const school: Readonly<Record<SpellSchool, string>> = {
  abjuration: '防護',
  conjuration: '咒法',
  // missing one → TS error
}

export default {
  school,
  // ... domain UI follows
}
```

Dynamic key lookup is then type-safe:

```ts
t(`spell.school.${school}`) // school: SpellSchool → LeafPath validates all branches
```

When `core` adds a new union member, the i18n file fails type-check until it's covered.

## Text style

| Scene                          | Rule                  | Example                         |
| ------------------------------ | --------------------- | ------------------------------- |
| Buttons / labels / nav         | No punctuation        | `'儲存'` / `'新增物品'`         |
| Toast / error / full sentences | End with `。`         | `'資料已被更新，請重新整理。'`  |
| Form placeholders              | No punctuation        | `'輸入暱稱'`                    |
| aria-label                     | No punctuation        | `'關閉視窗'`                    |
| Mixed CJK + Latin / digit      | Single space between  | `'已達上限 6 件'`、`'PHB 法術'` |
| Verb + object > object + verb  | Match natural reading | `'新增物品'` not `'物品新增'`   |

## DRY boundary

- Same word, **same meaning, multiple domains** → put in `ui.action.*` / `ui.message.*` (e.g. `save`, `savedSuccessfully`).
- Same word, **different domain context, may diverge later** → write it separately per domain. Don't pre-merge; abstract only after 3+ duplicates.
- **Never decompose sentences** into composable fragments (`'已新增' + noun + '到' + noun`). Chinese word order is sensitive; future locale work breaks.

## Adding a new key

1. Find the right file: domain key → `<domain>.ts`; cross-domain UI → `ui.ts` (or `ui/<section>.ts` if ui has been split).
2. Write the message. Enum portion uses `Readonly<Record<UnionKey, string>>`; UI uses a plain object literal.
3. Add the call site `t('path')`. TS rejects unknown path — if so, return to step 1.
4. Need a runtime value? Use `{name}` placeholder + `t(path, { name: value })`.
5. **Never** cast: `t('xx.yy' as MessagePath)` is a review reject.

## Test conventions

- Import `t` directly in specs — it's a pure function, locale is locked to zh-TW.
- Assert via `t()` lookup, not hardcoded Chinese: `expect(wrapper.text()).toContain(t('ui.action.save'))`. Refactoring message text won't redden tests.
- Don't write a dedicated spec for i18n keys — `LeafPath` + `Record<UnionKey, string>` enforce coverage at compile time, runtime has `logger.warn` for misses.

## Review checklist

When reviewing a `.vue` / `.ts` change:

- **Suspicious hardcoded Chinese**: `rg '>[一-鿿]' app/` and `rg "= ['\"][一-鿿]" app/` on the diff. Anything new in source belongs in i18n unless it's one of the exceptions below.
- **Exceptions (no i18n needed)**:
  - `import` / comments / logger calls
  - data bindings: `{{ character.name }}`, `:title="spell.name"`
  - `app/mocks/*` fixtures
  - test assertion strings (use `t()` instead, but raw is sometimes fine in isolated specs)
- **Outright reject**:
  - `v-html` rendering a `t()` result → XSS risk
  - `as MessagePath` cast → bypassing TS safety
  - new `.vue` adding hardcoded UI Chinese without a message entry

## Anti-patterns

1. Importing `vue-i18n` or `@nuxtjs/i18n` for the current single-locale product.
2. Sentence-fragment composition: `t('prefix') + count + t('suffix')`. Use `{key}` placeholder.
3. Casting unknown paths through `as MessagePath`.
4. Adding `enum/` (or any) subfolder under `zh-TW/` — keep it flat.
5. Calling `t()` on a backend-returned field (`spell.name` etc.).
6. Storing per-domain action verbs in `ui.ts` (e.g. `ui.addCharacter`) instead of `character.addCharacter`.
7. `v-html` of `t()` output.

## Locale expansion (future)

If a second locale ships, the migration path is:

1. Add `app/i18n/<locale>/` with the same file shape; ensure every `Record<UnionKey, string>` covers the same keys (TS enforces this).
2. Wire detection / persistence (`useI18n().setLocale` already exists; just expose to UI).
3. Re-evaluate `vue-i18n` / `@nuxtjs/i18n` — at that point ROI may flip. Migration is mechanical: `{key}` placeholder syntax and `t(path, params)` API both match vue-i18n's conventions, so call sites are zero-change.

Do not pre-build for this. zh-TW only until an explicit milestone says otherwise.
