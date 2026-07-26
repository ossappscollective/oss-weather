---
name: understand-project
description: Ground a feature or fix in existing code before planning or building — find a similar pattern, identify reusable assets, map the touch surface. Internal helper invoked by feat / fix (both modes) — not meant to be run on its own.
disable-model-invocation: true
---

Ground every plan and implementation in code that already exists. A plan that says "follows the same pattern as `app/components/edit/DocumentEdit.svelte`" beats one describing an abstraction in the abstract — the executor gets low cognitive load and a working reference. This is the _method_; the calling skill says what to build.

## Steps

1. **Learn the layout that applies.** App code is under `app/`: `.svelte` screens/components/modals live in `app/components/<feature>/` (feature dirs: `camera`, `edit`, `list`, `ocr`, `pdf`, `pkpass`, `qrcode`, `security`, `settings`, `view`, `common`, `widgets`); domain logic lives in service singletons under `app/services/` (`documents.ts`, `sync.ts`, `ocr.ts`, `security.ts`, …); data models in `app/models/`; helpers in `app/utils/`, `app/helpers/`, `app/transformers/`; strings in `app/i18n/`; SCSS themes in `app/themes/`. Platform splits use `.android.ts` / `.ios.ts`.
2. **Find a similar existing implementation.** Glob/Grep for a `.svelte` component or a service that solves a comparable problem. Read 1-2 end-to-end so you can point at them by path.
3. **Identify reusable assets** — existing components in `app/components/common/` and `app/components/widgets/`, svelte stores (`app/utils/svelte/store.ts`), service singletons, models, and utils/helpers. Reuse these by name rather than inventing new ones.
4. **Map the touch surface** — every file, component, service, model, i18n key that needs to change. Trace data flow and callers (service singletons are shared, so a change ripples) so nothing is missed.
5. **Check third-party libraries** — when a library is involved (`@nativescript-community/*`, `@akylas/*`, svelte-native, sqlite/kiss-orm, …), use Context7 for version-matched docs before assuming an API.

## Bias

Pick the simplest, cleanest solution: reuse existing patterns/components/hooks, fewest files touched, smallest new surface. If a clever approach and a boring approach reach the same outcome, choose the boring one.
