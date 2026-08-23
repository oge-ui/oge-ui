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

| Family     | Components                                                                                                                                                                                                                                                                                                                                                                        | Docs pages mirrored                                                                                                                                   | llms (react/full) | Parity gate                                                                   |
| ---------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------- |
| Buttons    | ✅ 3/3                                                                                                                                                                                                                                                                                                                                                                            | ✅ overview, interactions, button-group, drop-down-button, api                                                                                        | ✅ / ✅           | ✅                                                                            |
| Overlay    | ✅ panel, menu, tooltip, context menu, modal (+ provider), toast (+ provider)                                                                                                                                                                                                                                                                                                     | ✅ overview, tooltip-context-menu, modal, toast, api — all branch, section for section                                                                | ✅ / ✅           | ✅ `overlay` in `FAMILIES`                                                    |
| Inputs     | ✅ 15/15                                                                                                                                                                                                                                                                                                                                                                          | ✅ overview, select-box, autocomplete, toggle-controls, slider, date-box, color-box, tree-select, showcase, validation, api                           | ✅ / ✅           | ✅                                                                            |
| Tabs       | ✅ 2/2                                                                                                                                                                                                                                                                                                                                                                            | ✅ overview, api (routed is a recorded exception)                                                                                                     | ✅ / ✅           | ✅                                                                            |
| Layout     | ✅ 7/7                                                                                                                                                                                                                                                                                                                                                                            | ✅ accordion, card, progress, splitter, toolbar — overview + api each                                                                                 | ✅ / ✅           | ✅ (five entries)                                                             |
| Navigation | ✅ 6/6                                                                                                                                                                                                                                                                                                                                                                            | ✅ tree-view (overview + api), drawer, stepper, menubar, breadcrumb, pagination (both routed pages are recorded exceptions)                           | ✅ / ✅           | ✅                                                                            |
| Forms      | ✅ 2/2                                                                                                                                                                                                                                                                                                                                                                            | ✅ overview, layout, validation, api (three validation sections are recorded exceptions)                                                              | ✅ / ✅           | ✅                                                                            |
| Upload     | ✅ uploader, drop zone, trigger, config + transport providers                                                                                                                                                                                                                                                                                                                     | ✅ overview, api (the forms section is a recorded heading exception)                                                                                  | ✅ / ✅           | ✅ `upload` in `FAMILIES`                                                     |
| Data Grid  | 🟡 slices A+B: grid (sort, filter row + operator menu, search, paging, row/column virtualization, windowed loading, selection, keyboard nav, focused row, pinned/resizable/reorderable columns, adaptive hiding, persistence, CSV, grouping with group panel + summaries + deferred groups, master-detail, row/no-data render props, row drag), pager, config + storage providers | 🟡 overview, api, grouping, master-detail, rows branch; columns, filtering, selection, editing, persistence, context-menu pages show the shell notice | ✅ / ✅           | ⏳ not in `FAMILIES` until the family is whole (see the R6 phase table below) |

New families add a row here when they land — a family without its row (or
with a partial one) is not done, whatever the code says.

## Recorded parity exceptions

An exception is a **deliberate, dated, justified** gap — never a silent one.
Anything not listed here is a defect.

- **The forms `layout` prop (2026-08-15).** Angular builds its form from
  projected `<oge-form-item>` / `<oge-form-group>` / `<oge-form-tabs>` children.
  React has no content projection, so the same tree is a nested `layout` array
  of item, group and section objects — the same fields, the same defaults, the
  same resolver in `@oge-ui/behavior`. This is the one API shape the two layers
  cannot share, and it is a syntax difference, not a feature gap.
- **The forms `[fieldTree]` and `[formGroup]` bindings (2026-08-15).** Both bind
  an Angular forms engine — Signal Forms and reactive forms. React has neither,
  so `formData` + `onFormDataChange` is the single binding, and the same
  `validationRules` run through the same `evaluateOgeValidationRules()` the
  Angular schema calls. The validation page's "Angular Signal Forms", "Reactive
  forms" and "Schema-carried layout" sections document those engines (the last
  one via `metadata()` keys on a Signal Forms schema) and stay Angular-only;
  the four remaining sections mirror section for section.
- **The upload overview's forms section (2026-08-22).** The Angular page's
  "Angular forms" section binds `formControl`; React has no forms engine, so
  the React view's seventh section is "Controlled value & forms" — the
  controlled `value` pair plus the handle's `valid` flag, which is also what
  `<OgeForm>`'s `fileUploader` editor drives. Same position, same demo
  content, one heading that names the idiom instead of the framework.
- ~~**The `fileUploader` editor (2026-08-15).**~~ Closed 2026-08-22:
  `@oge-ui/react-upload` shipped and `<OgeForm>` renders `<OgeFileUploader>`
  for `editorType: 'fileUploader'`.
- **The data grid, sliced (2026-08-23).** `@oge-ui/react-grid` ships the
  engine in phases because the Angular grid is the suite's largest surface
  (3.6k lines over a 1.2k-line template). What the React grid is _not_ a
  trimmed copy of: every feature in slice A runs through the same behavior
  cores the Angular grid was rewired onto (`OgeGridStateCore`,
  `OgeGridDataCore`, the column resolver, the row/column virtualizers, the
  keyboard machine, the persistence core, the deferred-children loader) —
  none of it is reimplemented. Slice **B** (2026-08-23) added grouping (group
  panel, summaries, group footers, deferred groups), master-detail, the row
  and no-data render props, row drag and column reorder. The remaining
  slices, each with its feature page branching when it lands: **C** editing
  (cell/row/batch/popup/form with `<OgeForm>`), command column,
  `addRow`/`editRow`/…; **D** header filter, filter builder/panel, column
  chooser/bands, context menus, `highlightChanges`, deferred selection,
  Excel/PDF export entries. The family joins `FAMILIES` (and the status row turns ✅)
  when D lands; until then the React API table documents exactly what ships.
- **The grid toolbar slot (2026-08-23).** The Angular overview projects its
  export buttons into the grid toolbar through the `ogeToolbar` attribute;
  React's toolbar items land with slice D (`toolbarItems` render prop), so the
  React quick start reaches `exportCsv()` through the `ref` handle from a
  button beside the grid. Same demo, same data, one projection difference.
- **The grouping page's column chooser (2026-08-23).** The Angular group-panel
  demo also switches on `columnChooser`; the chooser is slice D, so the React
  demo runs without it (the `columnChooser` chip is replaced by `grouping`).
  Same data, same grouping, same summaries.
- **The tabs "Routed tabs" page (2026-08-13).** That page drives the selection
  from the Angular router's child routes — the demo _is_ an Angular-router
  integration, and React apps route with their own library. The React tabs
  expose the same controlled `selectedIndex`/`selectedKey` pair any router can
  drive, so nothing is missing from the component; the page stays Angular-only
  and React readers get the shell notice on it.
- **~~Inputs pages that demo `@oge-ui/forms`~~ — CLOSED 2026-08-15.** The
  color-box and slider "Inside a form" sections wrapped the editor in the
  Angular forms family, which had no React layer. R5 shipped
  `@oge-ui/react-forms`, so both React sections now render a real `<OgeForm>`
  with the same `editorType` / `editorOptions` item the Angular section uses.
  (The validation page's two renamed headings are a different exception — see
  below — because they name `@angular/forms`, not `@oge-ui/forms`.)
- **~~The splitter's "Forms inside a pane" section~~ — CLOSED 2026-08-15.**
  The React mirror now puts an `<OgeForm>` with `colCountByScreen` inside the
  pane, exactly as the Angular section does — the point of the section (a pane
  is not a query container) is demonstrated by the same component in both
  layers.
- **~~The stepper's "Inside a form" section~~ — CLOSED 2026-08-15.** The React
  mirror now wraps the steps in a `{ kind: 'steps' }` form section, so step
  completion comes from the form's own per-step error rollup rather than from
  hand-derived state.
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
