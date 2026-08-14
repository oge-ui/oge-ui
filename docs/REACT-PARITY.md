# React Parity Standard — "the exact copy" rule

**Every React-shipped piece of the suite is a full copy of its Angular
counterpart.** Not "roughly equivalent", not "the highlights": the same
components, the same features, the same docs pages with the same demo
sections showing the same example content, and the same machine-readable
docs. Buttons set the template; every family that follows holds the same bar.

This file is the checklist. [`ROADMAP-REACT.md`](../ROADMAP-REACT.md) owns the
schedule, [ADR 0001](adr/0001-multi-framework-strategy.md) /
[ADR 0002](adr/0002-framework-aware-docs.md) own the rationale, and the gates
below enforce what can be enforced mechanically.

## 1. Component parity

- Every public member of the Angular component has a React counterpart —
  props for inputs, callbacks for outputs, an imperative handle for public
  methods, render props for `TemplateRef` APIs, context providers for DI
  config. **Gate:** `docs-tools:parity` diffs the two API tables member by
  member; deliberate idiom differences carry a written reason in
  `tools/docs-tools/check-parity.mjs` or the build is red.
- Behavior is shared code, not a port: interaction machines, selection
  arithmetic, vocabularies, timings and defaults live in `@oge-ui/behavior` /
  `@oge-ui/core`, and the Angular component is rewired onto the extraction in
  the same change with its specs passing unchanged.
- Styles are the Angular package's SCSS compiled verbatim — a CSS rule
  written inside a React package is a defect.

## 2. Docs-page parity (the docs site)

The docs are one site (ADR 0002); a family's pages must read as the same
pages in both layers:

- **Every page of the family branches.** Overview, feature pages
  (interactions, button-group, drop-down-button, …) and the API page all
  render React content under the header switch — `FrameworkService.COVERAGE`
  says `'*'` for the family, so the "not in React yet" notice never shows.
- **Section-for-section mirror.** The React view has the same demo sections,
  in the same order, with the same headings and the same example content
  (same labels, same colors, same counters) as the Angular view — translated
  to React idiom, never trimmed. The TOC comes from the React sections
  export, so anchors match what is on screen.
- **Interactive previews are real React.** Demos with state (counters,
  selections) are React function components with `useState`, mounted through
  `app-react-host` — the preview runs the exact code the snippet shows.
- **Snippets are gated.** Every React demo lives in the family's
  `react-*-snippets.ts` via `reactDemoSource()` and compiles under
  `docs-tools:typecheck` (`jsx: react-jsx`). No inline samples, no exempt
  components.
- **Notes sections branch too.** Framework-specific advice (`(clicked)` vs
  `onClick`, providers vs context) renders per layer; shared facts stay
  single-sourced.

## 3. Machine-readable docs (`llms.txt`)

- The family's React package has a manifest entry with `platform: 'react'`,
  so `npx nx run docs-tools:llms` regenerates:
  - `apps/dev-app/public/llms/react/<family>.txt` — the per-package React
    reference (React conventions/mistakes prose, React API tables, every
    React demo),
  - the `llms.txt` index rows and the **`llms-full.txt`** sections for the
    React package — React ships in the full corpus, not only per-package,
  - `packages/react/<family>/llms.txt`, shipped inside the npm tarball by the
    `publishAssets` Vite plugin.
- **Gate:** `docs-tools:llms-check` fails when the committed artifacts drift
  from the generator; `docs-tools:llms` fails on unclaimed demo folders.

## 4. Verification per family

- Unit: vitest + Testing Library beside the source, StrictMode remount spec
  included.
- E2e: the family's pages mount real React trees in the switch's React view
  and pass axe.
- The full gate set is green: `lint test build typecheck`,
  `docs-tools:typecheck`, `docs-tools:llms`(+`-check`), `docs-tools:parity`,
  `nx format:check`.

## Status

| Family     | Components                  | Docs pages mirrored                                                                                                         | llms (react/full) | Parity gate                 |
| ---------- | --------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------- |
| Buttons    | ✅ 3/3                      | ✅ overview, interactions, button-group, drop-down-button, api                                                              | ✅ / ✅           | ✅                          |
| Overlay    | ✅ primitives (panel, menu) | documented through the drop-down demos until tooltip/modal/toast ship                                                       | ✅ / ✅           | joins with its own api page |
| Inputs     | ✅ 15/15                    | ✅ overview, select-box, autocomplete, toggle-controls, slider, date-box, color-box, tree-select, showcase, validation, api | ✅ / ✅           | ✅                          |
| Tabs       | ✅ 2/2                      | ✅ overview, api (routed is a recorded exception)                                                                           | ✅ / ✅           | ✅                          |
| Layout     | ✅ 7/7                      | ✅ accordion, card, progress, splitter, toolbar — overview + api each                                                       | ✅ / ✅           | ✅ (five entries)           |
| Navigation | ✅ 6/6                      | ✅ tree-view (overview + api), drawer, stepper, menubar, breadcrumb, pagination (both routed pages are recorded exceptions) | ✅ / ✅           | ✅                          |

New families add a row here when they land — a family without its row (or
with a partial one) is not done, whatever the code says.

## Recorded parity exceptions

An exception is a **deliberate, dated, justified** gap — never a silent one.
Anything not listed here is a defect.

- **The tabs "Routed tabs" page (2026-08-13).** That page drives the selection
  from the Angular router's child routes — the demo _is_ an Angular-router
  integration, and React apps route with their own library. The React tabs
  expose the same controlled `selectedIndex`/`selectedKey` pair any router can
  drive, so nothing is missing from the component; the page stays Angular-only
  and React readers get the shell notice on it.
- **Inputs pages that demo `@oge-ui/forms` (2026-08-13).** The color-box and
  slider "Inside a form" sections and the validation page's form-library
  sections wrap the editor in the Angular forms family, which has no React
  layer yet. The sections keep their position so the mirror stays
  section-for-section, but the React view shows the honest React idiom — the
  editors' `errors` / `errorText` / `errorDisplay` / `invalid` / `pending`
  props driven by plain state (or any React form library) — and says so in the
  description. They get rewritten onto `@oge-ui/react-forms` when R5 lands.
- **The splitter's "Forms inside a pane" section (2026-08-13).** The same gap,
  one family over: the Angular section puts an `<oge-form>` inside a pane to
  show that a pane is not a query container. The React mirror keeps the
  section, its position and its point — the editors are `@oge-ui/react-inputs`
  fields bound to plain state, the way any React form library would bind them —
  and says so in the description. It moves onto `@oge-ui/react-forms` with the
  inputs sections in R5.
- **The stepper's "Inside a form" section (2026-08-13).** The same
  `@oge-ui/forms` gap, one family over: the Angular section wraps the steps in
  `<oge-form-steps>`. The React mirror keeps the section, its position and its
  point — `@oge-ui/react-inputs` editors on plain state, with `completed`
  derived from it — and says so in the description. It moves onto
  `@oge-ui/react-forms` with the inputs and splitter sections in R5.
- **Two validation headings renamed (2026-08-13).** "Reactive Forms" →
  "Form library integration" and "Signal Forms" → "Schema-driven errors": both
  Angular headings name Angular-only bindings, so keeping them would promise an
  API the React layer does not have. Position, order and outcome are unchanged.
- **The breadcrumb and menubar "Routed" pages (2026-08-13).** Both drive their
  state from the Angular router's child routes — the demos _are_ router
  integrations, and React apps route with their own library. The React
  components expose the same `items` array and the same controlled state any
  router can drive, so nothing is missing from them; the pages stay
  Angular-only and React readers get the shell notice, exactly as on the tabs
  routed page.
- **Declarative child components (navigation, 2026-08-13).** Angular's
  `<oge-menubar-item>` and `<oge-breadcrumb-item>` content children have no
  React counterpart: React reserves the `key` prop, so `<OgeMenubarItem
key="new">` cannot carry the item identity the Angular input does. Both
  layers share the same `items` array API (`OgeMenubarItemData`,
  `OgeBreadcrumbItemData`) and the same descriptor merge order, which lives in
  `@oge-ui/behavior` — so this is a template-syntax difference, not a feature
  gap. The `TemplateRef` slots map to the `renderItem` / `renderSeparator`
  render props.
- **Pagination's jump-to-page commit (2026-08-13).** Angular binds `(change)` +
  `(keydown.enter)`; React has no `onChange` that maps to the native `change`
  event, so the React input is uncontrolled and commits on **blur or Enter** —
  the same clamping and the same 1-based re-sync. The React handle also exposes
  `pageCount()`, which Angular readers get off the instance signal.
- **~~`OgeTreeSelect` (inputs)~~ — CLOSED 2026-08-13.** The exception existed
  only because the navigation tree had no React port. It does now, so the
  React tree select ships on the same shared tree engine
  (`@oge-ui/behavior`'s tree-view core) and the inputs family is 15/15. Kept
  here as a record of how an exception is meant to end: the blocker is removed
  and the member is built, not the note reworded.
- **`OgeTreeSelect.inputChange` (2026-08-13).** Inherited from Angular's
  `OgeInputBase`, but the tree select's native input is `readonly`, so the
  event can never fire in either layer — it is dead surface on the Angular
  side. The React port omits it rather than shipping a callback that is never
  called.
