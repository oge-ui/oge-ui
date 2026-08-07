# OGE workspace — architecture & conventions

Single source of truth for how this workspace is organized and how new code must be written.
Read this before exploring the codebase; it replaces most discovery work.

## Stack

Nx 23 / Angular 22 / TypeScript 6 / npm. Tests: **vitest** (no Jest/Karma). E2e: Playwright + axe.
CI (`.github/workflows/ci.yml`): `npx nx run-many -t lint test build typecheck e2e` + `nx format:check`.

## Packages

| Project       | Path                 | npm                 | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------- | -------------------- | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`        | `packages/core`      | `@oge-ui/core`      | Framework-free TS data engine (DataSource, filtering, virtualization math). **No Angular imports — lint-enforced.** Built with `@nx/rollup`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `grid`        | `packages/grid`      | `@oge-ui/grid`      | Data grid. Secondary entries: `/foundation`, `/export-excel`, `/export-pdf`. Owns the design tokens and theme CSS. Depends on `inputs` (editors: one `OgeCellEditor` renders the dataType-matched `oge-*-box` in the compact `size=sm` shape; `.oge-editor` host class is load-bearing) and `overlay` (header filter / chooser / operator + context menus run on `OgeAnchoredPanel` + `oge-menu-list`; the canonical `OgeMenuItem` is re-exported from the barrel).                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `tree-list`   | `packages/tree-list` | `@oge-ui/tree-list` | Depends on grid, re-exports its column/template API. Secondary entry `/export-excel`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `pivot`       | `packages/pivot`     | `@oge-ui/pivot`     | Pivot grid on top of `core`'s PivotEngine.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `buttons`     | `packages/buttons`   | `@oge-ui/buttons`   | Button family (OgeButton, OgeButtonGroup, OgeDropDownButton). Depends on `overlay`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `overlay`     | `packages/overlay`   | `@oge-ui/overlay`   | Anchored popup primitives: `resolvePopupPosition` (incl. centered bare-side placements), `OgeAnchoredPanel` (virtual `anchorRect`, `transient` mode), `oge-popup`, `oge-menu-list` + canonical `OgeMenuItem`, and the `ogeTooltip` / `[ogeContextMenu]` directives (body-appended via `createComponent`; host element must be removed manually on destroy).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| `inputs`      | `packages/inputs`    | `@oge-ui/inputs`    | Form editors (OgeTextBox/OgeTextArea/OgeNumberBox), dropdown editors (OgeSelectBox/OgeTagBox/OgeAutocomplete), bare toggle controls (OgeCheckBox/OgeSwitch/OgeRadioGroup) and date editors (OgeCalendar/OgeDateBox). Base split: `OgeControlBase` (chrome-free — commit pipeline, CVA constructor-assignment, Signal Forms `FormValueControl`) → `OgeInputBase` (adds the field chrome). Dropdown editors share `lib/select-list/` (`SelectListEngine`, `SelectPanelController`, `ListVirtualizerModel` on core's `OffsetTree`, `expr.ts` resolvers). **Date convention:** native `Date` + `Intl` only — no date library, no `DateAdapter`; all day math goes through core's `date-utils.ts` (local construction, never `Date.parse`/`toISOString`); typed text parses via `formatToParts` part order; the calendar popup uses real DOM focus (APG date-picker-dialog), not `aria-activedescendant`. |
| `ui`          | `packages/ui`        | `oge-ui`            | Umbrella: pinned deps on every family + a re-export barrel (`export *` is this package's sanctioned exception; name collisions resolved by explicit re-export - see `src/index.ts`).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| `dev-app`     | `apps/dev-app`       | —                   | Docs/demo site (port 4200, Tailwind v4).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `dev-app-e2e` | `apps/dev-app-e2e`   | —                   | Playwright (chromium) + `@axe-core/playwright`.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |

All component libs are buildable + publishable (ng-packagr via `@nx/angular:package`, APF partial-Ivy),
`version 0.4.0`, `publishConfig.access: public`, Angular `^22.0.0` peers, `sideEffects: false`.

## Licensing (open-core)

Everything is MIT **except `packages/pivot`**, which is source-available
commercial (free for evaluation/development, paid for production —
`packages/pivot/LICENSE`, `"license": "SEE LICENSE IN LICENSE"` in its
package.json). The MIT packages carry a public "will remain MIT" commitment
(root README) — never move an MIT package or an existing MIT feature into the
commercial tier. New analytics-oriented packages (charts, scheduler, …) may
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

There is **no test target in project.json** — `@nx/vitest` infers it from `vite.config.mts`.

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
- Generics where rows are involved: `OgeGrid<T extends object = Record<string, unknown>>`.

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
- Template slots: structural directive per slot, selector `[oge<Slot>Template]`, exported context interface
  - `ngTemplateContextGuard` — see `packages/grid/src/lib/templates/cell-template.ts`.

## Styling & theming

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
- Focus convention: `:focus-visible { outline: none; box-shadow: 0 0 0 3px var(--oge-accent-soft); }`.
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

## Testing

- Specs live **beside the source**; large components split into feature-named files
  (`tree-list-selection.spec.ts`, `button-hold.spec.ts`).
- Pattern: local host `@Component` + `TestBed.createComponent` + a `settle(fixture)` helper
  (`detectChanges → whenStable → detectChanges`); assert on rendered DOM by `.oge-*` class.
  `globals: true` (no vitest imports needed).
- E2e: `apps/dev-app-e2e/src/*.spec.ts` against `http://localhost:4200`; a11y via `AxeBuilder`
  (`a11y.spec.ts`), `color-contrast` rule disabled.
- Overlay-flavored specs must stub `requestAnimationFrame` **asynchronously**
  (`setTimeout(cb, 0)`) — a synchronous stub re-enters Angular's render scheduler mid-tick and
  produces bogus NG0100 errors (see `select-box.spec.ts`).

## Dev-app registration (per new component)

1. Page under `apps/dev-app/src/app/pages/<area>/<page>.ts` — standalone, `app-` selector, OnPush,
   inline template using `DocHeader` + `DemoCard` + `const SNIPPET` code strings.
2. Lazy route in `apps/dev-app/src/app/app.routes.ts` (`components/<name>/…`, `title: 'OGE — …'`).
3. Nav entry in `allSections` in `apps/dev-app/src/app/app.ts` — icon must exist in the `IconName` union
   in `apps/dev-app/src/app/shared/icon.ts`.
4. Optional Playwright smoke/a11y spec in `apps/dev-app-e2e/src/`.

The landing page (`pages/home/home.ts`, route `''`) is the one full-bleed page: `App.isHome`
hides the sidebar shell and the `doc-shell` wrapper for it. Its canvas wave / pointer-parallax
effects run on native listeners + rAF outside change detection and must stay dependency-free
(no 3D/animation libraries) and disabled under `prefers-reduced-motion`.

## Release

`nx release` versioning via git tags (`release.version.currentVersionResolver: "git-tag"`), publishing from
`dist/{projectRoot}`. Keep workspace-internal deps pinned exactly (`"@oge-ui/core": "0.3.0"`).
