# OGE workspace — architecture & conventions

Single source of truth for how this workspace is organized and how new code must be written.
New to the codebase? Start here — this page answers most "where does X live
/ how do we do Y" questions before you have to dig through the sources.

## Stack

Nx 23 / Angular 22 / TypeScript 6 / npm. Tests: **vitest** (no Jest/Karma). E2e: Playwright + axe.
CI (`.github/workflows/ci.yml`): `npx nx run-many -t lint test build typecheck e2e` + `nx format:check`.

## Packages

| Project       | Path                  | npm                  | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------- | --------------------- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`        | `packages/core`       | `@oge-ui/core`       | Framework-free TS data engine (DataSource, filtering, virtualization math). **No Angular imports — lint-enforced.** Built with `@nx/rollup`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `grid`        | `packages/grid`       | `@oge-ui/grid`       | Data grid. Secondary entries: `/foundation`, `/export-excel`, `/export-pdf`. Owns the design tokens and theme CSS. Depends on `inputs` (editors: one `OgeCellEditor` renders the dataType-matched `oge-*-box` in the compact `size=sm` shape; `.oge-editor` host class is load-bearing) and `overlay` (header filter / chooser / operator + context menus run on `OgeAnchoredPanel` + `oge-menu-list`; the edit-popup and filter-builder dialogs run on `oge-modal`; the canonical `OgeMenuItem` is re-exported from the barrel), plus `forms` (the `form`/`popup` edit surfaces render `<oge-form>`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `tree-list`   | `packages/tree-list`  | `@oge-ui/tree-list`  | Depends on grid, re-exports its column/template API. Secondary entry `/export-excel`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `pivot`       | `packages/pivot`      | `@oge-ui/pivot`      | Pivot grid on top of `core`'s PivotEngine.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `buttons`     | `packages/buttons`    | `@oge-ui/buttons`    | Button family (OgeButton, OgeButtonGroup, OgeDropDownButton). Depends on `overlay`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `overlay`     | `packages/overlay`    | `@oge-ui/overlay`    | Anchored popup primitives: `resolvePopupPosition` (incl. centered bare-side placements), `OgeAnchoredPanel` (virtual `anchorRect`, `transient` mode), `oge-popup`, `oge-menu-list` + canonical `OgeMenuItem` (an `items` field on any item makes the row a submenu parent — the list opens nested levels itself, one panel per level on the shared Escape stack, absorbing `'escape'`/`'back'` per level and chaining `'select'`/`'tab'` to the root owner, so every consumer nests for free), and the `ogeTooltip` / `[ogeContextMenu]` directives (body-appended via `createComponent`; host element must be removed manually on destroy). Plus `oge-modal` (centered/top dialog: focus trap, ref-counted scroll lock, async `closeGuard`, typed `close(result)`, opt-in drag/resize/fullscreen/`inertBackground`) — all open surfaces share the internal `overlay-stack.ts` so Escape always closes the topmost (popup inside modal closes first). The declarative modal renders inline where declared: keep it away from `transform`ed ancestors; `OgeModalService.open()` is the body-appended imperative escape hatch (`OGE_MODAL_DATA` + `OgeModalRef`). `OgeToastService` (service-only) renders body-appended toast regions with permanent hidden live-region announcers; toasts never take focus and never join the Escape stack, and their timers pause on hover/focus/tab-hidden with remaining-time resume. The modal/toast strings own the config's `messages` entries.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `inputs`      | `packages/inputs`     | `@oge-ui/inputs`     | Form editors (OgeTextBox/OgeTextArea/OgeNumberBox), dropdown editors (OgeSelectBox/OgeTagBox/OgeAutocomplete), bare toggle controls (OgeCheckBox/OgeSwitch/OgeRadioGroup), date editors (OgeCalendar/OgeDateBox/OgeDateRangeBox) and the APG sliders (OgeSlider/OgeRangeSlider — bare controls on `OgeControlBase`; drag via the splitter's gesture idiom with Escape-to-cancel, arithmetic in core's `slider-math.ts`; the range pair deliberately omits the `FormValueControl` clause because the contract's `min`/`max` typing is `NonNullable<TValue>`, while runtime `[formField]` binding still works). Base split: `OgeControlBase` (chrome-free — commit pipeline, CVA constructor-assignment, Signal Forms `FormValueControl`) → `OgeInputBase` (adds the field chrome). Dropdown editors share `lib/select-list/` (`SelectListEngine`, `SelectPanelController`, `ListVirtualizerModel` on core's `OffsetTree`, `expr.ts` resolvers). **Date convention:** native `Date` + `Intl` only — no date library, no `DateAdapter`; all day math goes through core's `date-utils.ts` (local construction, never `Date.parse`/`toISOString`); typed text parses via `formatToParts` part order; the calendar popup uses real DOM focus (APG date-picker-dialog), not `aria-activedescendant`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `tabs`        | `packages/tabs`       | `@oge-ui/tabs`       | Tab family: `OgeTabs` (stand-alone strip), `OgeTabPanel` (strip + content), declarative `OgeTab` children merged with a data-driven `items` input (children first — ButtonGroup precedent). Internal `oge-tab-strip` presentational component owns keyboard (APG roving tabindex, automatic/manual activation), overflow arrows, the all-tabs menu (depends on `overlay`: `OgeAnchoredPanel` + `oge-menu-list`) and drag reorder; the shared abstract `OgeTabsBase` directive owns the models and the cancelable selection/close/reorder pipelines. Per-tab async `closeGuard` follows the modal's guard semantics (single-flight, rejection = veto); the app removes closed tabs on `tabClosed`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `layout`      | `packages/layout`     | `@oge-ui/layout`     | Layout containers. Today `OgeAccordion` + declarative `OgeAccordionItem` (WAI-ARIA APG accordion: heading-wrapped `<button>` headers, all in the Tab sequence, opt-in arrow/Home/End/type-ahead, single/multiple + `collapsible`, lazy render, async `expandGuard`, invalid-section indicator, per-panel async `contentLoader` with skeleton/retry, header-actions slot) and `OgeSplitter` + declarative `OgeSplitterPane` (WAI-ARIA APG **window splitter**: focusable `role="separator"` tracks in one CSS grid, `fr`-ratio sizing with `'<n>px'`/`'<n>%'` escape hatches, arrow/Home/End/Enter, collapse-to-`inert`, pointer capture + `touch-action: none`, self-recursive nesting) and `OgeToolbar` + declarative `OgeToolbarItem` (WAI-ARIA APG **toolbar**: `role="toolbar"`, roving tabindex over its own buttons _and_ projected controls, before/center/after groups, three projection slots, and an overflow menu built on `overlay`s `OgeAnchoredPanel` + `oge-menu-list` — the "which items fit" arithmetic is core's pure `fitToolbarItems`, so it is unit-tested without a DOM) and `OgeCard` (a content surface with attribute-slot sections — `[ogeCardMedia]`/`[ogeCardActions]`/`[ogeCardFooter]`/`[ogeCardAvatar]`/`[ogeCardHeaderActions]`/`[ogeCardSeparator]` — `stylingMode` outlined/raised/filled/flat on the `--oge-shadow-card` token, `size` density, a `severity` rail, an `aria-busy` `loading` skeleton and a visual-only `interactive` lift; **no role and no clickable input**, because no ARIA card pattern exists — the stretched-link pattern is documented instead) and the loading trio `OgeProgressBar` / `OgeLoadIndicator` / `OgeSkeleton` (canonicalizing the hand-drawn spinners and shimmers the suite carried; `role="progressbar"` with `aria-valuenow` omitted in the indeterminate state, reduced motion slows the indeterminate animations rather than freezing them, the skeleton is always `aria-hidden` decoration — the loading region owns `aria-busy`; grid's filler-row class became `.oge-grid-skeleton` so the canonical component owns `.oge-skeleton`). Depends on `core` and, since the toolbar, `overlay`. |
| `forms`       | `packages/forms`      | `@oge-ui/forms`      | Form layout over the `inputs` editors: `OgeForm` (+ renderless `OgeFormItem` / `OgeFormGroup` config children, merged through the shared `OgeFormNode` query token so one query keeps document order) and `OgeValidationSummary`. Three binding modes on one component — `[fieldTree]` (Signal Forms), `[formGroup]` (reactive), `[(formData)]` (plain model, over an internally owned `form()`); the mode is **derived**, never configured. **Validation is Angular's Signal Forms, full stop**: `validationRules` compiles to a schema (`schema-from-rules.ts`), so there is no second engine. Responsive columns are `@container` queries on the form's own inline size, not window width. Sections (`<oge-form-tabs>` / `<oge-form-accordion>` / `<oge-form-steps>`) **wrap** `tabs`, `layout` and `navigation` rather than copying them, and a failed submit reveals the section holding the first invalid field. `createMetadataKey()`-based `OGE_FORM_*` keys let a Signal Forms schema carry its own layout, so `<oge-form [fieldTree]>` can need no items at all. Depends on `inputs`, `tabs`, `layout` and `navigation`. **`grid` and `tree-list` render `<oge-form>` for `editing.mode: 'form'                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | 'popup'`** — that duplication is retired; `renderFormElement: false`is what makes it legal, because nested`<form>` elements are invalid HTML. |
| `navigation`  | `packages/navigation` | `@oge-ui/navigation` | Navigation controls. Today `OgeTreeView` (WAI-ARIA APG treeview: roving tabindex, Right/Left open-child / close-parent semantics, type-ahead, `*`; flat **or** nested data; tri-state cascade checkboxes; search; lazy `loadChildren`; virtual scrolling; drag & drop reparenting). The tree needed no new data code — core's `lib/tree/` engine was already there from tree-list. Also `OgeDrawer` (overlay/push/side, with modality derived from the mode), `OgeStepper` + `OgeStep` (no APG stepper pattern exists, so an ordered list of `<button>` headers carrying `aria-current="step"` with `role="region"` panels — one semantic in both orientations, unlike Material) and `OgeMenubar` + nestable `OgeMenubarItem` (WAI-ARIA APG **menubar**: roving tabindex over the bar, submenus at every depth are `overlay`'s `oge-menu-list` recursion; `openMode` click/hover applies to the top level only; `compactBelow` collapses the whole bar into a hamburger via core's pure `resolveMenubarCompact` — container width, never the window; `url` items render as real links and `activeKey` drives `aria-current="page"`, because no package takes a router dependency) and `OgeBreadcrumb` + flat `OgeBreadcrumbItem` (WAI-ARIA APG **breadcrumb**: a `<nav>` landmark with an `<ol>` of real links, `aria-current="page"` on the non-interactive last crumb, and — deliberately — **no roving tabindex**, because the APG defines no keyboard behavior for it; `collapseMode: 'auto'` folds the oldest middle crumbs into an ellipsis menu via core's `fitToolbarItems` against the **container** width, and the collapsed crumbs stay reachable as links). Depends on `core` and, since the drawer, `overlay`.                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `ui`          | `packages/ui`         | `oge-ui`             | Umbrella: pinned deps on every family + a re-export barrel (`export *` is this package's sanctioned exception; name collisions resolved by explicit re-export - see `src/index.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `dev-app`     | `apps/dev-app`        | —                    | Docs/demo site (port 4200, Tailwind v4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `dev-app-e2e` | `apps/dev-app-e2e`    | —                    | Playwright (chromium) + `@axe-core/playwright`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

All component libs are buildable + publishable (ng-packagr via `@nx/angular:package`, APF partial-Ivy),
`publishConfig.access: public`, Angular `^22.0.0` peers, `sideEffects: false`. Versions are
tag-driven (`nx release`); don't hardcode them in docs.

## Licensing (open-core)

Everything is MIT **except `packages/pivot`**, which is source-available
commercial (free for evaluation/development, paid for production —
`packages/pivot/LICENSE`, `"license": "SEE LICENSE IN LICENSE"` in its
package.json). The MIT packages carry a public "will remain MIT" commitment
(root README) — never move an MIT package or an existing MIT feature into the
commercial tier. New enterprise-oriented packages (charts, scheduler, BPMN, …) may
be commercial; copy pivot's LICENSE when scaffolding one. The `oge-ui`
umbrella is MIT-only and must **not** depend on or re-export commercial
packages. The root `LICENSE` lists the per-directory split. There is no
license-key/runtime enforcement yet — deliberate, revisit when sales start.

## New package checklist

Scaffold by copying `packages/tree-list`'s config file set and renaming:
`project.json` (prefix `oge`, tags `["scope:<name>"]`, `@nx/angular:package` build, `nx-release-publish`,
`release.version` git-tag block), `package.json`, `ng-package.json` (`dest: ../../dist/packages/<name>`,
`entryFile: src/index.ts`), `tsconfig.json` / `tsconfig.lib.json` / `tsconfig.lib.prod.json`
(`compilationMode: "partial"`) / `tsconfig.spec.json`, `vite.config.mts` (vitest, jsdom,
`setupFiles: ['src/test-setup.ts']`), `eslint.config.mjs`, `src/test-setup.ts` (4 lines, identical everywhere),
`src/index.ts` barrel.

Then register in **four** places:

1. `tsconfig.base.json` → `"@oge-ui/<name>": ["./packages/<name>/src/index.ts"]`
2. `nx.json` → `release.projects` array
3. root `eslint.config.mjs` → `depConstraints`: add `scope:<name>` entry and allow it from `scope:app`
4. root `README.md` package table (+ `ROADMAP.md` if feature-tracked)
5. `tools/docs-tools/lib/manifest.mjs` → `PACKAGES` entry, and `"assets": ["llms.txt"]` in
   `ng-package.json` (see **Machine-readable docs** below). `nx run docs-tools:llms` warns about any
   package folder missing from the manifest, so this step cannot be forgotten silently.

There is **no test target in project.json** — `@nx/vitest` infers it from `vite.config.mts`.

## Cross-package sharing (what gets extracted vs. copied)

Sibling component packages (tabs, layout, …) grow the same shapes. The rule:

- **Extract to `@oge-ui/core` only what is non-trivial _and_ framework-free.** Core cannot import Angular
  (lint-enforced), which is the right filter — it keeps the shared layer to pure logic that can be unit
  tested on its own. Currently: `runAsyncGuard` (`util/async-guard.ts` — the veto pipeline where a boolean
  settles synchronously, a promise reports pending, and throw _and_ reject both mean veto),
  `stepEnabledIndex` / `edgeEnabledIndex` (`util/nav-index.ts` — arrow and Home/End math with wrapping and
  disabled-skipping) and `createTypeAheadBuffer` / `matchByPrefix` (`util/type-ahead.ts`, folding through
  `foldText` so matching is locale- and accent-insensitive) and `normalizeSplitTracks` /
  `resizeSplitAt` / `splitSeparatorRange` (`util/split-sizes.ts` — the splitter's two-unit pane math:
  `fr` shares normalized to 100 next to fixed-pixel tracks, a two-neighbour delta clamped by both
  panes' bounds, and the APG separator value triple) and `fitToolbarItems` (`util/toolbar-fit.ts` —
  which toolbar entries fit and which collapse into the overflow menu, given measured sizes and an
  `'auto' | 'always' | 'never'` policy each; a non-positive container size means "not measured yet"
  and everything stays inline, which is what keeps jsdom specs deterministic).
  Consumed by tabs, layout and navigation.
  Reach for an existing engine before writing one: `packages/navigation`'s tree view needed **no** new data
  code because `lib/tree/` (index, nested flatten, filter modes, tri-state cascade) was already there from
  tree-list. Note the flip side — do not force a kernel helper where it does not fit: the tree's
  `loadChildren` deliberately avoids `runAsyncGuard`, because that models a veto (rejection = "no") and
  would swallow the error a failed fetch has to report.
- **Copy the Angular-shaped conventions**; do not build a shared `@oge-ui/foundation`. These are 4–15 line
  idioms whose types differ per component, so a generic base would trade a little duplication for awkward
  `TemplateRef` generics and a permanent public npm surface for internal plumbing. The three to copy:
  1. **Descriptor merge** — a `computed()` producing `[...fromChildren, ...fromItems]` (children first,
     ButtonGroup precedent), each source filtered by `visible` and given a stable `id` (`key` ?? a per-source
     auto id, distinct prefixes so the two namespaces cannot collide).
  2. **Cancelable pipeline** — build the `-ing` event with `cancel: false`, `emit()` it, re-read `cancel`,
     bail; then guard, then commit, then emit the past-tense event. Guards run _after_ the pre-event.
  3. **Config/messages** — per-package `InjectionToken` + `provideOge<X>Config()` shallow-merging `messages`,
     overlaid per instance by a `[messages]` input in a `mergedMessages` computed.
- A **component-level template slot** queried with `contentChild(X, { descendants: false })` applies to
  `items`-mode entries only; a slot that is really container chrome (e.g. the accordion's toggle icon) may
  fall back for declarative children too — say which in the TSDoc.

## Component authoring rules

Every component in every lib follows all of these (see `packages/grid/src/lib/pager/pager.ts` for the
smallest complete example):

- Standalone (implicit — no `standalone: true`), `changeDetection: ChangeDetectionStrategy.OnPush`,
  `encapsulation: ViewEncapsulation.None`.
- **Signals only**: `input()`, `input.required()`, `model()` (two-way), `output()`, `computed()`, `signal()`,
  `effect()`, `afterRenderEffect()`, `afterNextRender()`, `viewChild()` / `contentChild()` / `contentChildren()`.
  **Never** decorators (`@Input`, `@Output`, `@ViewChild`, `@HostBinding`, `@HostListener`).
- Host bindings go in the decorator `host` object:
  `host: { class: 'oge-button', '[class.oge-disabled]': 'disabled()' }`.
- New control flow only: `@if` / `@for (…; track …)` / `@switch`. `NgTemplateOutlet` is the only
  `@angular/common` import in use.
- Class names: `Oge<Name>` with **no** `Component`/`Directive` suffix (`OgeGrid`, `OgeColumn`, `OgeButton`).
  Selectors: `oge-<kebab>` elements, `[oge<Camel>]` attribute directives. Renderless config directives
  (e.g. `oge-column`) use element selectors with an inline eslint-disable.
- Members: `readonly` fields, `protected` for template-only, `private` internals. TSDoc (1–3 sentence,
  no `@param`) on every public member; class-level JSDoc carries a runnable HTML snippet.
- Zoneless-ready: no `NgZone` assumptions; callbacks only set signals / emit outputs.
- **Secondary affordances inside an interactive header** — two cases, pick by the parent's role:
  - Inside a **composite-widget role** (`role="tab"`, `option`, `treeitem`, `gridcell` headers…) axe fails a
    focusable child as `nested-interactive`. Render the affordance as an `aria-hidden` `<span>`, resolve its
    clicks from `event.target.closest('.oge-x')` in the parent's handler, and give the parent a keyboard path
    advertised via `aria-keyshortcuts` (see `packages/tabs`' close ✕ / Delete).
  - When the header is a **plain `<button>`** (the APG accordion shape: title in a `<button>` wrapped in a
    heading), the button carries no composite role, so the fix is simply to put the action _outside_ it —
    a real `<button>` sibling in the header row. It is natively Tab-reachable, needs no `aria-keyshortcuts`,
    and the widget's arrow navigation only visits the toggles (see `packages/layout`'s
    `[ogeAccordionHeaderActionsTemplate]`). Prefer this whenever the role allows it.
  - The composite case also covers **state**, not just actions: a tree's checkbox cannot be a real
    `<input>` inside `role="treeitem"`. Put the state on the row itself (`aria-checked`, incl. `mixed`)
    and render an `aria-hidden` glyph — see `packages/navigation`'s `.oge-tree-view-check`.
- **Not every APG pattern uses a roving tabindex.** The accordion pattern deliberately does not: all header
  buttons stay `tabindex="0"` and only Enter/Space/Tab are required. Arrow/Home/End/type-ahead (and
  `Ctrl+PageUp/PageDown`, handled on the host so they work from inside panel content) are an opt-in
  enhancement. The treeview pattern is the opposite — exactly one node in the Tab sequence. Check the
  actual pattern before copying (or omitting) tab-strip focus machinery.
- **Bind `[tabindex]`, not `[attr.tabindex]`, on a roving-tabindex row, and put the `(keydown)` on the same
  element as the `(click)`.** `@angular-eslint`'s `interactive-supports-focus` and
  `click-events-have-key-events` cannot see through `[attr.…]` or an ancestor handler, and will fail an
  otherwise correct widget (see `tab-strip.ts` and `tree-view.ts`).
- **Recursion has two shapes; pick by what repeats.** A standalone component **may list itself in its
  own `imports`** and render its own selector — verified against Angular 22, and what
  `packages/layout`'s splitter uses for nested panes, because each level is a real splitter with its
  own separators, gestures and outputs. When the repetition is only markup, keep it to a
  self-outletting `<ng-template>` instead (`packages/forms`' `#nodeList`, which recurses for nested
  groups without a second component instance). Neither needs `forwardRef`.
- **A composite widget may render a flat DOM.** Where the structure is expressed with `aria-level` /
  `aria-posinset` / `aria-setsize`, the APG does not require nested containers — and a flat list is what
  makes windowed rendering possible at all. `packages/navigation`'s tree renders one `role="treeitem"` per
  visible node with no nested `role="group"`, which is why it can virtualize; core's `flattenTreeData`
  already emits `level`/`posInSet`/`setSize` for exactly this.
- An expanded panel the user may not collapse gets **`aria-disabled="true"`, never the `disabled`
  attribute** — it has to stay focusable (APG accordion).
- Generics where rows are involved: `OgeGrid<T extends object = Record<string, unknown>>`.
- **Two Signal Forms facts a component that hosts editors must know** (both verified against
  `@angular/forms/signals`, not assumed):
  1. When `[formField]` is on an element, the `FormField` directive **writes `disabled` / `readonly`
     / `required` / `min` / `max` itself and overwrites any template binding of the same input**. So
     never bind those alongside `[formField]` — express them in the schema (`disabled()`,
     `readonly()`), or apply form-level disabling with a `<fieldset disabled>` wrapper. Angular
     cannot apply a directive conditionally, which is why `packages/forms`' editor template carries
     its `@switch` twice (one `[formField]` arm, one `[formControl]` arm).
  2. `FieldTree<T>` is **invariant** in `T` (its `FieldState` holds a `WritableSignal<T>`), so Angular
     cannot infer a component generic from an `input<FieldTree<T>>` position — it falls back to
     `any`, and `FieldTree<any>` resolves to the _compat_ field state that no real tree satisfies.
     Accept a **structural alias naming only the members you use** with the value type erased
     (`packages/forms`' `OgeFormFieldTree`), not `FieldTree<any>`.
- Reactive-forms state is **not reactive**: `AbstractControl.invalid` / `.touched` are plain
  properties, so a `computed()` over them never re-runs. Bridge `control.events` into a revision
  signal and read it inside the computed (`packages/forms`' `controlRevision`, and the grid's
  editing model hit the same thing).

### Public API language

- Outputs are past-tense/noun names **without `on` prefix** (`rowClick`, `selectionChanged`, `contentReady`).
  Cancelable pre-events use `-ing` names and a mutable `cancel: boolean` (`savingChanges`, `rowExpanding`).
- Event payloads: flat exported interfaces `Oge<Name>Event`, raw DOM event under `event`,
  no component/element back-reference.
- Modes are lowercase string unions exported as named types (`'single' | 'multiple'`), **never enums**.
- Complex features use the **boolean-shorthand-or-options-object** idiom:
  `input<boolean | OgeFilterRowOptions>(false)`.
- `undefined` default means "fall back to DI config / enclosing parent".
- Barrels (`src/index.ts`): explicit named exports with inline `type` modifiers, no `export *`
  (core is the historical exception).
- Config/i18n: `InjectionToken` with factory default + `provideOge<X>Config()` shallow-merge provider —
  copy `packages/grid/src/lib/config.ts`. **Every user-facing string (incl. aria labels) lives in a
  messages interface.**
- Template slots: structural directive per slot, selector `[oge<Slot>Template]`, exported context interface.
  When the same slot directive is legal both at component level and inside a child config component
  (e.g. `[ogeTabContentTemplate]` in `oge-tab-panel` vs inside an `<oge-tab>`), query the component-level
  one with `contentChild(X, { descendants: false })` — the signal `contentChild` default (`descendants: true`)
  would steal the first child-level template.
  - `ngTemplateContextGuard` — see `packages/grid/src/lib/templates/cell-template.ts`.

## Styling & theming

- **Container queries over window-width callbacks.** When a component's layout depends on how much
  room it has, key it off its own inline size (`container-type: inline-size` on the host + `@container`
  blocks reading custom properties the component sets) — never a `window`-width callback. A form or
  grid nested in a dialog, a drawer or a cell must lay itself out from _its_ width; see
  `packages/forms/src/lib/form/form.scss`.
- Token source of truth: `packages/grid/src/lib/styles/_tokens.scss` (`@mixin core-tokens`) — `--oge-bg`,
  `--oge-text-color`, `--oge-border-color`, `--oge-accent`, `--oge-accent-soft`, `--oge-focus-ring`,
  `--oge-radius`, severity tokens, etc. **Components must reference tokens, never raw values.**
- Other packages `@use` the tokens via a relative path into grid
  (`@use '../../../../grid/src/lib/styles/tokens';`) and `@include tokens.core-tokens;` at their host class.
  SCSS reads source, not dist — no Nx graph edge results (accepted limitation).
- All styles are global `.oge-*` classes (ViewEncapsulation.None), BEM-ish dashes.
- Themes: `packages/grid/src/lib/styles/themes/{dark,bootstrap,tailwind}.css`. Each lists component root
  selectors explicitly — **a new component's host class must be added to all three files**. Dark mode is
  activated by `.oge-theme-dark` on any ancestor.
- Focus convention: two rings. Pointer/programmatic focus gets the soft ring
  (`box-shadow: 0 0 0 3px var(--oge-accent-soft)`); keyboard `:focus-visible` gets the strong ring
  (`outline: none; box-shadow: 0 0 0 3px var(--oge-focus-ring)`) — see `field-chrome.scss`.
  Transitions `120ms ease`. RTL via logical properties (no `rtlEnabled` machinery in new code).
- Icons are inline SVG with `aria-hidden="true"` — there is no icon font or icon package.

## Component completeness standard

Every component (new and existing) ships with a **complete, reference-parity-checked
API surface**: properties, imperative methods (`focus()`, `reset()`,
`open()/close()/toggle()` where applicable), and a full event set — rich
payloads (`previousValue`, originating `event`, `item`/`index`) following the
house naming (no `on` prefix; never an output named after a native DOM event —
they double-fire; native `keydown`/`paste` etc. are reachable via host
bubbling and documented instead). jQuery-era lifecycle events
(`onInitialized`/`onOptionChanged`/`onContentReady`) are intentionally not
replicated — Angular lifecycle, `effect()` and signals cover them. Each
component page in the dev-app is expected to grow a full API
reference section (Properties / Methods / Events / Types).
The API reference is published as a `components/<area>/api` page per area:
a hand-compiled `<area>-api-data.ts` (entries mirror the source TSDoc — update
it whenever the public API changes) rendered by the shared `ApiReference`
component (`apps/dev-app/src/app/shared/api-reference.ts`); parity mapping
decisions live in ROADMAP.md's "API parity" section.

**The parity sweep is proactive, not on request.** Before a component is called
done: fetch the live docs of every reference library (DevExtreme, Kendo,
PrimeNG, Material/CDK — and the relevant WAI-ARIA APG pattern, which is the
backbone when one exists), map **every** member, and close the gaps in the same
change. A ROADMAP row may end as `Skipped` only with a written rationale;
`partial` rows are unfinished work, not a resting state — either complete the
feature or demote it to `Skipped` with the reason. Where a reference lacks the
component entirely, write the absence down (the dxCardView rule). Missing
capabilities the references never had but the pattern calls for (e.g. a
menubar's `shortcut` + `aria-keyshortcuts`) are fair game — bold them as
**OGE extra** rows.

**Visual bar: a current-generation design system, not a wireframe.** Every
component's SCSS is expected to look contemporary out of the box — token-driven
(never raw values): consistent radii (`--oge-radius`/`-lg`), soft state layers
(`--oge-row-hover-bg`, `--oge-accent-soft`) instead of hard color swaps, the
house focus ring (`outline: none; box-shadow: 0 0 0 3px var(--oge-focus-ring)`
on `:focus-visible`), 120ms ease micro-transitions suppressed under
`prefers-reduced-motion`, logical properties for RTL, and open/selected states
that read at a glance (accent tint + indicator, not just a border). "Works but
looks like a prototype" does not pass review.

## Testing

- Specs live **beside the source**; large components split into feature-named files
  (`tree-list-selection.spec.ts`, `button-hold.spec.ts`).
- Pattern: local host `@Component` + `TestBed.createComponent` + a `settle(fixture)` helper
  (`detectChanges → whenStable → detectChanges`); assert on rendered DOM by `.oge-*` class.
  `globals: true` (no vitest imports needed).
- E2e: `apps/dev-app-e2e/src/*.spec.ts` against `http://localhost:4200`; a11y via `AxeBuilder`
  (`a11y.spec.ts`), `color-contrast` rule disabled.
- **Vitest workers are capped, on purpose.** Nx runs projects concurrently
  (`parallel: 3` in `nx.json`) and each vitest would otherwise size its own pool to the whole
  machine — 3 × cores threads on cores cores. That oversubscription is what used to make heavy
  jsdom specs (grid virtualization, tree-list filtering) miss the default 5 s timeout in a full
  `run-many -t test`, while the same specs passed in isolation. `nx.json` therefore passes
  `--maxWorkers=30%` to the inferred `test` target: a **percentage**, so it adapts to a 4-core CI
  runner as well as a 16-core laptop, and scoped to the Nx target, so running `vitest` directly in
  one package still uses the whole machine. If you change `parallel`, change the share to match.
- Overlay-flavored specs must stub `requestAnimationFrame` **asynchronously**
  (`setTimeout(cb, 0)`) — a synchronous stub re-enters Angular's render scheduler mid-tick and
  produces bogus NG0100 errors (see `select-box.spec.ts`).

## Dev-app registration (per new component)

1. Page under `apps/dev-app/src/app/pages/<area>/<page>.ts` — standalone, `app-` selector, OnPush,
   inline template using `DocHeader` + `DemoCard`.
2. Code samples in a sibling **`<page>-snippets.ts`** data module (never inline in the page) —
   see **Docs snippets must compile** below.
3. Lazy route in `apps/dev-app/src/app/app.routes.ts` (`components/<name>/…`, `title: 'OGE — …'`).
4. Nav entry in `allSections` in `apps/dev-app/src/app/app.ts` — icon must exist in the `IconName` union
   in `apps/dev-app/src/app/shared/icon.ts`. A new **family** gets its own section with
   `group: COMPONENTS_GROUP`; sections in that group render alphabetically.
5. Three places a new family must also appear, or it is invisible to visitors:
   the `/components` gallery (`pages/components/components.ts` — `FamilyKey`, a `@case` preview and a
   `families` entry; also add the family to `components-index.spec.ts`'s `FAMILIES` list, and **never
   mention another family's name in a gallery description** — the e2e locates cards by case-insensitive
   `hasText` substring, so a description containing "overlay" hijacks the Overlay card's locator), the
   landing page index (`pages/home/home.ts` — `tiles`, kept at three columns so
   the page does not grow), and the landing page's npm band (`packages`).
6. API members in the family's `*-api-data.ts`, rendered from its `api.ts` page — this is what
   `llms.txt` reads, so an undocumented member is invisible to every coding assistant.
7. `npx nx run docs-tools:llms`, and commit the regenerated artifacts.
8. Optional Playwright smoke/a11y spec in `apps/dev-app-e2e/src/`.

**A component is not done until its AI-facing docs ship with it.** Three gates enforce that:

| Gate                    | Fails when                                                          |
| ----------------------- | ------------------------------------------------------------------- |
| `docs-tools:typecheck`  | a page declares a code sample inline, or a snippet does not compile |
| `docs-tools:llms`       | a demo folder is claimed by no package's `pageDirs`                 |
| `docs-tools:llms-check` | the committed `llms.txt` / `sitemap.xml` differ from the generator  |

`docs-tools:llms` additionally _warns_ about exported symbols with no API-reference row. That list is
the backlog of members an assistant currently has to guess at — keep it shrinking.

### `demo-card` descriptions are double-decoded

`<app-demo-card description="…">` reaches the DOM through `[innerHTML]`, and a
static Angular attribute is entity-decoded **before** that. A single `&lt;` is
therefore decoded to a real `<`, and the sanitizer then eats the element name it
forms — `&lt;oge-form&gt;` renders as an empty `<code>` box. Escape angle
brackets **twice** in a `description`: `&amp;lt;oge-form&amp;gt;`. Prose inside a
component template (a `<p>` in the doc header) is parsed once and needs the
single escape, as usual.

### Docs snippets must compile

Docs snippets are the code developers _and_ coding assistants copy out of ogeui.com, so a snippet
that does not compile is worse than no snippet. Two rules make that enforceable:

- **Snippets live in `<page>-snippets.ts` pure data modules**, beside the page — the same split as
  `*-api-data.ts`. Those modules import only `shared/demo-source.ts` (Angular-free), which is what
  lets Node read them for the generator and the compile gate.
- **Each demo is one complete standalone component**, built with `demoSource({ use, helpers, types,
before, body, template, after, dataset })`: `use` lands in the import statement _and_
  `@Component.imports`, `helpers` are imported but not declarable (`form()`, `Validators`), `types`
  are `import type`. `@angular/core` imports are derived from a closed symbol list scanned over the
  TypeScript parts only. `dataset: 'employees' | 'org'` inlines a small row array so `[data]`
  bindings resolve. Demo cards render them with `language="ts"`.

`npx nx run docs-tools:typecheck` writes every snippet into a scratch program and compiles it with
`ngc` under `strictTemplates` — unknown elements, wrong string-union values, missing members and bad
bindings all fail the build. Genuine fragments (shell commands, CSS token blocks, provider excerpts)
stay plain strings and are skipped, but the checker **lists every exemption** so none is silent.

The landing page (`pages/home/home.ts`, route `''`) is the one full-bleed page: `App.isHome`
hides the sidebar shell and the `doc-shell` wrapper for it. Its canvas wave / pointer-parallax
effects run on native listeners + rAF outside change detection and must stay dependency-free
(no 3D/animation libraries) and disabled under `prefers-reduced-motion`.

## Machine-readable docs (`tools/docs-tools`)

Coding assistants are a first-class docs audience: they read the repo, `node_modules`, and whatever
the site serves. Three artifacts serve them, all **generated and committed**:

| Artifact                             | Purpose                                                      |
| ------------------------------------ | ------------------------------------------------------------ |
| `apps/dev-app/public/llms.txt`       | [llmstxt.org](https://llmstxt.org) index of packages + pages |
| `apps/dev-app/public/llms-full.txt`  | conventions, every API member, every demo — one file         |
| `apps/dev-app/public/llms/<pkg>.txt` | one self-contained reference per package                     |
| `packages/<pkg>/llms.txt`            | same file, shipped in the tarball via `assets`               |
| `apps/dev-app/public/sitemap.xml`    | generated from `app.routes.ts` (no longer hand-maintained)   |

Everything is **derived from the workspace**, never hand-written twice: routes from `app.routes.ts`,
link notes from `SeoService.DESCRIPTIONS`, member tables from each API page's
`<app-api-reference>` bindings back through `*-api-data.ts`, symbol inventories from the entry-point
barrels, demos from `*-snippets.ts`. The only hand-maintained input is
`tools/docs-tools/lib/manifest.mjs` (per-package npm name, docs root, pitch) and the LLM-facing prose
in `lib/prose.mjs` (**Writing OGE code** rules + a **Common mistakes** table of wrong guesses).

```sh
npx nx run docs-tools:llms         # regenerate (commit the result)
npx nx run docs-tools:llms-check   # CI gate: committed artifacts match the generator
npx nx run docs-tools:typecheck    # CI gate: every docs snippet compiles (see Testing)
```

`llms` also prints two "no silent gaps" reports: package folders missing from the manifest, and
exported symbols with no API-reference row. `*-api-data.ts` is hand-compiled from source TSDoc, so
that second report is the only signal that a table has fallen behind its component.

## `ng add` (`tools/oge-schematics`)

Every publishable package ships an `ng add` schematic. One implementation lives in
`tools/oge-schematics/src/` and `build.mjs` bundles it once per package with esbuild, substituting
the package name through `define`. Packages therefore carry **no schematic source** — only
`"schematics": "./schematics/collection.json"` in `package.json`; `collection.json`, `schema.json`
and the CJS bundle are written straight into `dist/packages/<pkg>/schematics/`.

What it does: registers an optional theme stylesheet (`--theme=dark|tailwind|bootstrap`, inserted
**first** in `styles` so the app's own stylesheet still wins), and writes an OGE usage block into the
consumer's `AGENTS.md` between `<!-- oge-ui:start -->` markers — regenerated from the OGE packages in
their `package.json`, opt out with `--skip-agents-file`. Nothing throws: a workspace it cannot read
(Nx repo, bare library, no `build` target) gets a warning and the manual one-liner.

Two constraints that are easy to break:

- The bundle must be **`index.cjs`**, not `index.js` — ng-packagr stamps `"type": "module"` on the
  dist `package.json`, and the schematics engine loads factories with `require`.
- `schematics` must run **after** the package builds (ng-packagr wipes `dist/packages/<pkg>` first),
  which is why the target `dependsOn` every package `build` and declares
  `dist/packages/*/schematics` as its outputs so a cache hit restores them.

```sh
npx nx run oge-schematics:typecheck   # tsc over the schematic sources
npx nx run oge-schematics:test        # SchematicTestRunner specs (vitest, node env)
npx nx run oge-schematics:schematics  # build the bundles into dist
```

## Release

`nx release` versioning via git tags (`release.version.currentVersionResolver: "git-tag"`), publishing from
`dist/{projectRoot}`. Keep workspace-internal deps pinned exactly to the current release
(`"@oge-ui/core": "0.6.0"` at the time of writing). `nx release` also generates the root
`CHANGELOG.md` and a GitHub Release per version.
