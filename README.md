<p align="center">
  <img src="apps/dev-app/public/logo.png" alt="OGE UI logo" width="120" />
</p>

<h1 align="center">OGE — Angular UI Components</h1>

<p align="center">
  Signal-based, zoneless Angular components engineered for data-heavy apps:<br />
  a virtualized <b>Data Grid</b>, <b>Tree List</b>, <b>Pivot Grid</b>, a full set of <b>form editors</b> (text, number,<br />
  select/tag/autocomplete, date, toggle), <b>Buttons</b>, <b>Modal</b> dialogs and <b>Toast</b> notifications.
</p>

<p align="center">
  <a href="https://ogeui.com"><b>ogeui.com</b></a> — docs, live demos &amp; API reference
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oge-ui"><img src="https://img.shields.io/npm/v/oge-ui?label=oge-ui&color=6366f1" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@oge-ui/grid"><img src="https://img.shields.io/npm/v/@oge-ui/grid?label=%40oge-ui%2Fgrid&color=8b5cf6" alt="npm version" /></a>
  <a href="https://github.com/oge-ui/oge-ui/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/oge-ui/oge-ui/ci.yml?branch=main&label=CI" alt="CI status" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT%20%2B%20Commercial-22d3ee" alt="MIT license with commercial pivot, bpmn, scheduler, gantt, kanban and charts" /></a>
  <img src="https://img.shields.io/badge/Angular-%E2%89%A522-dd0031" alt="Angular 22+" />
</p>

---

## Why OGE?

- **Signals end to end** — every input, output and piece of state is a signal.
  No decorators, no lifecycle guesswork, full template type checking.
- **Zoneless by default** — no Zone.js, no global change-detection sweeps;
  components mark exactly what moved.
- **Built for serious data** — row _and_ column virtualization into the
  millions, server-side sort/filter/page/group, live push updates, infinite
  scrolling, CSV/Excel/PDF export.
- **Accessible by default** — WAI-ARIA grid and combobox semantics, full
  keyboard navigation, axe-tested docs pages.
- **Design-token theming** — one set of CSS variables drives every component;
  dark, Tailwind and Bootstrap bridges ship in the box.
- **Zero runtime dependencies** — the only hard dependency between packages is
  OGE's own framework-free core. Export libraries (`exceljs`, `jspdf`) are
  optional peers: never installed, bundled or executed unless you opt in.

## Installation

Everything at once:

```sh
npm install oge-ui
```

…or à la carte — every package is standalone:

```sh
npm install @oge-ui/grid        # data grid (+ @oge-ui/core)
npm install @oge-ui/tree-list   # hierarchical grid
npm install @oge-ui/buttons     # buttons, groups, drop-downs (+ @oge-ui/overlay)
npm install @oge-ui/inputs      # text, number, select, tag, date, color and toggle editors
npm install @oge-ui/tabs        # tab strip and tab panel
npm install @oge-ui/layout      # accordion, splitter, toolbar (layout containers)
npm install @oge-ui/navigation  # tree view + drawer + stepper + menubar + pagination (navigation controls)
npm install @oge-ui/forms       # form layout, groups and validation (+ @oge-ui/inputs)
npm install @oge-ui/upload      # file uploader (+ @oge-ui/layout)
npm install @oge-ui/pivot       # pivot table (commercial — see Licensing)
npm install @oge-ui/bpmn        # BPMN 2.0 editor (commercial — see Licensing)
npm install @oge-ui/scheduler   # scheduler / event calendar (commercial — see Licensing)
npm install @oge-ui/gantt       # gantt chart (commercial — see Licensing)
npm install @oge-ui/kanban      # kanban board (commercial — see Licensing)
npm install @oge-ui/charts      # charts / data visualization (commercial — see Licensing)
```

### React

The same suite, as native React components over the same engine — one install,
one stylesheet:

```sh
npm install @oge-ui/react            # umbrella: every MIT React family
npm install @oge-ui/react-grid       # or one family at a time …
npm install @oge-ui/react-inputs
npm install @oge-ui/react-scheduler  # commercial families install on their own
```

```tsx
import { OgeGrid, OgeTextBox } from '@oge-ui/react';
import '@oge-ui/react/styles.css';
```

Since 1.1.1 the React layer is at full parity with the Angular suite: every
family ships in both, on one shared engine, and the docs site switches every
page between them. The few deliberate differences (router-driven demos, idiom
mappings such as `TemplateRef` ↔ render props) are recorded in
[`docs/REACT-PARITY.md`](docs/REACT-PARITY.md).

## Quick start

```ts
import { Component, signal } from '@angular/core';
import { OgeButton, OgeColumn, OgeGrid, OgeSelectBox } from 'oge-ui';

@Component({
  selector: 'app-orders',
  imports: [OgeGrid, OgeColumn, OgeSelectBox, OgeButton],
  template: `
    <oge-select-box label="Region" [items]="regions" [searchEnabled]="true" [(value)]="region" />

    <oge-grid [data]="orders()" keyField="id" [filterRow]="true">
      <oge-column field="product" caption="Product" />
      <oge-column field="amount" caption="Amount" dataType="number" />
    </oge-grid>

    <oge-button text="Save" severity="accent" [action]="save" />
  `,
})
export class Orders {
  readonly regions = ['EMEA', 'APAC', 'Americas'];
  readonly region = signal<unknown>(null);
  readonly orders = signal([{ id: 1, product: 'Aurora Display', amount: 1249 }]);

  // async action: the button manages its own loading spinner
  readonly save = () => fetch('/api/orders', { method: 'POST' });
}
```

No modules, no forms boilerplate — `[(value)]` binds straight to a
`signal()`, and the same editors also plug into Signal Forms
(`[formField]`) and reactive forms (`formControl`).

## Packages

All packages are MIT except the six commercial families — `@oge-ui/pivot`,
`@oge-ui/bpmn`, `@oge-ui/scheduler`, `@oge-ui/gantt`, `@oge-ui/kanban` and
`@oge-ui/charts` — together with their framework-free engines
(`@oge-ui/<family>-engine`, ADR 0003) and their React layers
(`@oge-ui/react-<family>`). Those are commercial (free for evaluation and
development) — see [Licensing](#licensing).

| Package                                                 | Description                                                                                                                                                                                                                                                                                                                                                                               | npm                                                           |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [`oge-ui`](packages/ui)                                 | **Umbrella**: one install + one import path for the whole MIT suite                                                                                                                                                                                                                                                                                                                       | [npm](https://www.npmjs.com/package/oge-ui)                   |
| [`@oge-ui/grid`](packages/grid)                         | Virtualized Data Grid: sorting, filtering, grouping, editing, master-detail, export                                                                                                                                                                                                                                                                                                       | [npm](https://www.npmjs.com/package/@oge-ui/grid)             |
| [`@oge-ui/tree-list`](packages/tree-list)               | Hierarchical grid: lazy loading, tri-state selection, drag & drop                                                                                                                                                                                                                                                                                                                         | [npm](https://www.npmjs.com/package/@oge-ui/tree-list)        |
| [`@oge-ui/pivot`](packages/pivot)                       | Pivot Grid (commercial): rows × columns × measures, totals, two-axis virtualization                                                                                                                                                                                                                                                                                                       | [npm](https://www.npmjs.com/package/@oge-ui/pivot)            |
| [`@oge-ui/pivot-engine`](packages/pivot-engine)         | Pivot engine (commercial): the framework-free field-layout, header-layout, menu, filter, chooser and keyboard machines both pivot render layers run                                                                                                                                                                                                                                       | [npm](https://www.npmjs.com/package/@oge-ui/pivot-engine)     |
| [`@oge-ui/bpmn`](packages/bpmn)                         | BPMN Editor (commercial): from-scratch BPMN 2.0 modeler with its own XML + DI engine, no watermark                                                                                                                                                                                                                                                                                        | [npm](https://www.npmjs.com/package/@oge-ui/bpmn)             |
| [`@oge-ui/bpmn-engine`](packages/bpmn-engine)           | BPMN engine (commercial): the framework-free model, XML/JSON/SVG, routing, rules, command stack and editor core both BPMN editors run                                                                                                                                                                                                                                                     | [npm](https://www.npmjs.com/package/@oge-ui/bpmn-engine)      |
| [`@oge-ui/scheduler`](packages/scheduler)               | Scheduler (commercial): day/week/month event calendar, all-day strip, drag & resize with Escape-cancel, appointment popup + form                                                                                                                                                                                                                                                          | [npm](https://www.npmjs.com/package/@oge-ui/scheduler)        |
| [`@oge-ui/scheduler-engine`](packages/scheduler-engine) | Scheduler engine (commercial): the framework-free core both scheduler render layers run — layout kernels, RRULE expansion, gesture math, keyboard maps, the CRUD/recurrence core and the message catalog                                                                                                                                                                                  | [npm](https://www.npmjs.com/package/@oge-ui/scheduler-engine) |
| [`@oge-ui/gantt`](packages/gantt)                       | Gantt (commercial): task tree + timeline, dependencies, critical path, baselines, drag editing, undo/redo                                                                                                                                                                                                                                                                                 | [npm](https://www.npmjs.com/package/@oge-ui/gantt)            |
| [`@oge-ui/gantt-engine`](packages/gantt-engine)         | Gantt engine (commercial): the framework-free kernel and controller both Gantt render layers run — installed automatically, rarely imported directly                                                                                                                                                                                                                                      | [npm](https://www.npmjs.com/package/@oge-ui/gantt-engine)     |
| [`@oge-ui/kanban`](packages/kanban)                     | Kanban (commercial): columns + swimlanes, WIP limits, per-column virtualization, drag & drop with Escape-cancel, keyboard card moving, built-in dialog and menu                                                                                                                                                                                                                           | [npm](https://www.npmjs.com/package/@oge-ui/kanban)           |
| [`@oge-ui/kanban-engine`](packages/kanban-engine)       | Kanban engine (commercial): the framework-free board model, drag/keyboard machines, move pipeline and editor model both Kanban render layers run                                                                                                                                                                                                                                          | [npm](https://www.npmjs.com/package/@oge-ui/kanban-engine)    |
| [`@oge-ui/charts`](packages/charts)                     | Charts (commercial): line/spline/area/bar/stacked/scatter/range/candlestick + pie/doughnut on a dependency-free SVG kernel — zoom & pan, crosshair, tooltips, legend                                                                                                                                                                                                                      | [npm](https://www.npmjs.com/package/@oge-ui/charts)           |
| [`@oge-ui/charts-engine`](packages/charts-engine)       | Framework-free charts engine (commercial) both chart render layers run: scales, series layout, path builders, pie/radar geometry, the cartesian/pie/polar/range-selector view models, keyboard maps, gestures, messages and the image exporter                                                                                                                                            | [npm](https://www.npmjs.com/package/@oge-ui/charts-engine)    |
| [`@oge-ui/buttons`](packages/buttons)                   | Buttons, groups & drop-down/split buttons: async actions, click guards, hold-to-confirm                                                                                                                                                                                                                                                                                                   | [npm](https://www.npmjs.com/package/@oge-ui/buttons)          |
| [`@oge-ui/inputs`](packages/inputs)                     | Form editors: text, number, select / tree select / tag / autocomplete, date, color, checkbox/switch/radio                                                                                                                                                                                                                                                                                 | [npm](https://www.npmjs.com/package/@oge-ui/inputs)           |
| [`@oge-ui/overlay`](packages/overlay)                   | Anchored popups, menus, tooltips, context menus, modal dialogs and toasts                                                                                                                                                                                                                                                                                                                 | [npm](https://www.npmjs.com/package/@oge-ui/overlay)          |
| [`@oge-ui/tabs`](packages/tabs)                         | Tabs & TabPanel: lazy render, closable tabs with async guards, overflow, drag reorder                                                                                                                                                                                                                                                                                                     | [npm](https://www.npmjs.com/package/@oge-ui/tabs)             |
| [`@oge-ui/layout`](packages/layout)                     | Accordion, Splitter & Toolbar: expansion panels, resizable / collapsible panes, APG command bar                                                                                                                                                                                                                                                                                           | [npm](https://www.npmjs.com/package/@oge-ui/layout)           |
| [`@oge-ui/navigation`](packages/navigation)             | TreeView: flat or nested data, tri-state checkboxes, search, lazy load, virtual scroll, DnD; Drawer: overlay/push/side with modality derived from mode; Stepper: linear wizard with one ARIA semantic in both orientations; Menubar: APG menubar with nested submenus and a container-width hamburger; Pagination: adaptive page navigator with page-size selector and info label         | [npm](https://www.npmjs.com/package/@oge-ui/navigation)       |
| [`@oge-ui/forms`](packages/forms)                       | Form layout: responsive columns, fieldset groups, validation rules, validation summary                                                                                                                                                                                                                                                                                                    | [npm](https://www.npmjs.com/package/@oge-ui/forms)            |
| [`@oge-ui/upload`](packages/upload)                     | File Upload: drag & drop with directory and paste, restrictions with on-row reasons, previews, chunked resumable transfer with pause/resume/retry                                                                                                                                                                                                                                         | [npm](https://www.npmjs.com/package/@oge-ui/upload)           |
| [`@oge-ui/core`](packages/core)                         | Framework-free data engine: data sources, filtering, pivot math, virtualization                                                                                                                                                                                                                                                                                                           | [npm](https://www.npmjs.com/package/@oge-ui/core)             |
| [`@oge-ui/behavior`](packages/behavior)                 | Framework-free interaction & a11y layer shared by every render layer: popup positioning, focus trap, the shared overlay Escape stack, scroll lock, plus the input/tabs/layout/navigation decision engines both layers run on                                                                                                                                                              | [npm](https://www.npmjs.com/package/@oge-ui/behavior)         |
| [`@oge-ui/react`](packages/react/oge)                   | **React.** The whole React suite behind one install and one stylesheet — the umbrella over every package below                                                                                                                                                                                                                                                                            | [npm](https://www.npmjs.com/package/@oge-ui/react)            |
| [`@oge-ui/react-buttons`](packages/react/buttons)       | **React.** Buttons, groups & toggle groups — the same press machine and stylesheet as the Angular package                                                                                                                                                                                                                                                                                 | [npm](https://www.npmjs.com/package/@oge-ui/react-buttons)    |
| [`@oge-ui/react-inputs`](packages/react/inputs)         | **React.** The full editor set on one field chrome: text, textarea, number, the drop-down editors with virtual scrolling, toggles, sliders, color box, calendar and the date editors                                                                                                                                                                                                      | [npm](https://www.npmjs.com/package/@oge-ui/react-inputs)     |
| [`@oge-ui/react-tabs`](packages/react/tabs)             | **React.** Tab strip and tab panel: APG activation, overflow menu, closable tabs with async guards, drag reordering and lazy panels                                                                                                                                                                                                                                                       | [npm](https://www.npmjs.com/package/@oge-ui/react-tabs)       |
| [`@oge-ui/react-layout`](packages/react/layout)         | **React.** Layout containers and loading visuals — card, accordion, splitter, toolbar, progress bar, load indicator and skeleton                                                                                                                                                                                                                                                          | [npm](https://www.npmjs.com/package/@oge-ui/react-layout)     |
| [`@oge-ui/react-navigation`](packages/react/navigation) | **React.** Navigation and wayfinding — virtualized tree view, drawer, stepper, menubar, breadcrumb and pagination                                                                                                                                                                                                                                                                         | [npm](https://www.npmjs.com/package/@oge-ui/react-navigation) |
| [`@oge-ui/react-overlay`](packages/react/overlay)       | **React.** Overlay surfaces: viewport-aware anchored popups, WAI-ARIA menus, tooltips, context menu, modal dialog with async guards and drag/resize, stacked toasts — the same machines and stylesheet as the Angular overlay                                                                                                                                                             | [npm](https://www.npmjs.com/package/@oge-ui/react-overlay)    |
| [`@oge-ui/react-forms`](packages/react/forms)           | **React.** Form layout over the editors: nested `layout` array of items, groups and tabbed/accordion/wizard sections, responsive columns, declarative validation rules and the validation summary                                                                                                                                                                                         | [npm](https://www.npmjs.com/package/@oge-ui/react-forms)      |
| [`@oge-ui/react-upload`](packages/react/upload)         | **React.** File upload: drag & drop with directory and paste, restrictions with on-row reasons, previews, chunked resumable transfer, external drop zones and triggers — the same upload engine as the Angular package                                                                                                                                                                    | [npm](https://www.npmjs.com/package/@oge-ui/react-upload)     |
| [`@oge-ui/react-charts`](packages/react/charts)         | **React.** Charts (commercial): the sixteen cartesian series types, pie/doughnut, radar/polar and the range selector — zoom & pan, crosshair, tooltips, legend, keyboard inspection, PNG/SVG export — on the same charts engine as the Angular package                                                                                                                                    | [npm](https://www.npmjs.com/package/@oge-ui/react-charts)     |
| [`@oge-ui/react-grid`](packages/react/grid)             | **React.** Data grid on the shared grid engine: sorting, filter row + search, paging, row/column virtualization, windowed remote loading, selection, keyboard navigation, grouping with summaries and deferred groups, master-detail, row render props, row drag, pinned/resizable/reorderable columns, persistence, CSV — editing and header filters follow (see `docs/REACT-PARITY.md`) | [npm](https://www.npmjs.com/package/@oge-ui/react-grid)       |
| [`@oge-ui/react-kanban`](packages/react/kanban)         | **React.** Kanban (commercial): columns + swimlanes, WIP limits, per-column virtualization, drag & drop with Escape-cancel, Ctrl+Arrow keyboard card moving, built-in dialog, menu and toolbar — the same engine and stylesheet as the Angular package                                                                                                                                    | [npm](https://www.npmjs.com/package/@oge-ui/react-kanban)     |
| [`@oge-ui/react-tree-list`](packages/react/tree-list)   | **React.** Tree list on the shared tree engine: flat or nested data, lazy per-expansion loading, ancestor-preserving filtering, recursive tri-state selection, paging, virtualization, editing, drag & drop reparenting, treegrid keyboard, persistence, CSV/Excel                                                                                                                        | [npm](https://www.npmjs.com/package/@oge-ui/react-tree-list)  |
| [`@oge-ui/react-bpmn`](packages/react/bpmn)             | **React** (commercial, not in the MIT umbrella). BPMN 2.0 editor: palette, context pad, properties panel, minimap, undo/redo, XML/JSON/SVG import & export — the same engine and stylesheet as the Angular editor                                                                                                                                                                         | [npm](https://www.npmjs.com/package/@oge-ui/react-bpmn)       |
| [`@oge-ui/react-scheduler`](packages/react/scheduler)   | **React.** Scheduler (commercial): day/week/work-week/month/agenda/timeline/year views, drag & resize with Escape-cancel, recurrence with occurrence-vs-series editing, resources, reminders, popup + form editor — the same engine and stylesheet as the Angular package                                                                                                                 | [npm](https://www.npmjs.com/package/@oge-ui/react-scheduler)  |
| [`@oge-ui/react-pivot`](packages/react/pivot)           | **React, commercial.** Pivot grid on the shared `@oge-ui/pivot-engine`: field panel, header/measure menus, value filters, field chooser, two-axis virtualization, persistence, CSV/Excel                                                                                                                                                                                                  | [npm](https://www.npmjs.com/package/@oge-ui/react-pivot)      |
| [`@oge-ui/react-gantt`](packages/react/gantt)           | **React.** Gantt (commercial) on the shared Gantt engine: task tree + timeline, dependencies, critical path, baselines, drag editing, undo/redo, task dialog, Excel/PDF/PNG export                                                                                                                                                                                                        | [npm](https://www.npmjs.com/package/@oge-ui/react-gantt)      |

## Theming

Every component reads one set of CSS design tokens — override them anywhere
in the cascade:

```css
:root {
  --oge-accent: #6366f1;
  --oge-radius: 8px;
}
```

Token defaults have zero specificity, so a plain `:root` rule wins and tokens
cascade into any subtree. Bundled themes ship in `@oge-ui/core/themes/`:
**dark** (`.oge-theme-dark` or `data-oge-theme="dark"` on any ancestor,
`"auto"` to follow the OS), **Tailwind** and **Bootstrap** bridge stylesheets. See the
[styling guide](https://ogeui.com/getting-started/styling).

## Localization

All user-facing strings (including aria labels) live in per-package message
catalogs — override globally with `provideOge<X>Config()` or per instance via
`[messages]`. See the
[localization guide](https://ogeui.com/getting-started/localization).

## For AI coding assistants

OGE ships a machine-readable reference so an assistant can write correct code
without guessing:

| File                                                | What it is                                                             |
| --------------------------------------------------- | ---------------------------------------------------------------------- |
| [`/llms.txt`](https://ogeui.com/llms.txt)           | [llmstxt.org](https://llmstxt.org) index — packages and every doc page |
| [`/llms-full.txt`](https://ogeui.com/llms-full.txt) | conventions, every documented API member and every demo, in one file   |
| `https://ogeui.com/llms/<package>.txt`              | one self-contained reference per package                               |
| `node_modules/@oge-ui/<package>/llms.txt`           | the same per-package file, inside the installed tarball                |

`ng add @oge-ui/<package>` also writes a short usage block into your
`AGENTS.md`, so assistants working in your repo reach for OGE by default. Pass
`--skip-agents-file` to opt out.

## Compatibility

| OGE | Angular | Notes                                    |
| --- | ------- | ---------------------------------------- |
| 0.x | ≥ 22    | standalone components, signals, zoneless |

## Contributing

This is an Nx workspace:

```sh
npm ci
npx nx serve dev-app          # docs site on http://localhost:4200
npx nx run-many -t test       # vitest suites
npx nx run-many -t lint build # what CI runs
```

Architecture and house conventions live in
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md); feature-parity tracking in
[`ROADMAP.md`](ROADMAP.md). Please read
[`CONTRIBUTING.md`](CONTRIBUTING.md) before opening a PR; security issues go
through [`SECURITY.md`](SECURITY.md), and the
[code of conduct](CODE_OF_CONDUCT.md) applies in all project spaces.

## Licensing

OGE UI is **open-core**:

- **MIT — free forever.** `oge-ui`, `@oge-ui/core`, `@oge-ui/grid`
  (including Excel/PDF export, master-detail and server-side operations),
  `@oge-ui/tree-list`, `@oge-ui/inputs`, `@oge-ui/buttons`,
  `@oge-ui/tabs`, `@oge-ui/layout`, `@oge-ui/navigation`,
  `@oge-ui/forms`, `@oge-ui/upload` and `@oge-ui/overlay` are [MIT-licensed](LICENSE). This is a commitment:
  these packages and every feature currently in them will remain MIT.
- **Commercial — `@oge-ui/pivot`, `@oge-ui/bpmn`, `@oge-ui/scheduler`,
  `@oge-ui/gantt`, `@oge-ui/kanban` and `@oge-ui/charts`, with each family's
  framework-free engine (`@oge-ui/<family>-engine`) and React layer
  (`@oge-ui/react-<family>`).** The pivot grid, the BPMN editor, the
  scheduler, the Gantt, the Kanban and the Charts are source-available
  commercial software: free for evaluation, development and testing;
  production use requires a paid license. Every package of a family ships
  the family's `LICENSE` (e.g. [packages/charts/LICENSE](packages/charts/LICENSE),
  also in `packages/charts-engine` and `packages/react/charts`); the root
  [LICENSE](LICENSE) lists every commercial directory, and
  [ogeui.com/license](https://ogeui.com/license) has the terms. Future
  enterprise-oriented packages may join this tier — never anything that is
  MIT today.
