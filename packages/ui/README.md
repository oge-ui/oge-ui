<p align="center">
  <a href="https://ogeui.com"><img src="https://ogeui.com/logo.png" alt="OGE UI logo" width="96" /></a>
</p>

<h1 align="center">oge-ui</h1>

<p align="center">
  One-install umbrella for the <b>OGE Angular UI suite</b> — signal-based,
  zoneless, themeable components engineered for data-heavy apps.
</p>

<p align="center">
  <a href="https://ogeui.com"><b>ogeui.com</b></a> — docs, live demos &amp; API reference
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/oge-ui"><img src="https://img.shields.io/npm/v/oge-ui?color=6366f1" alt="npm version" /></a>
  <img src="https://img.shields.io/badge/license-MIT-22d3ee" alt="MIT license" />
  <img src="https://img.shields.io/badge/Angular-%E2%89%A522-dd0031" alt="Angular 22+" />
</p>

---

```sh
npm install oge-ui
```

One install, one import path:

```ts
import { OgeGrid, OgeColumn, OgeSelectBox, OgeTagBox, OgeButton } from 'oge-ui';
```

## What's inside

| Component family                            | Highlights                                                                                                                             | Docs                                                    |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Data Grid** (`@oge-ui/grid`)              | Row + column virtualization into the millions, sorting, filtering, grouping, editing, master-detail, remote data, CSV/Excel/PDF export | [demos](https://ogeui.com/components/data-grid)         |
| **Tree List** (`@oge-ui/tree-list`)         | The grid feature set on hierarchical data: lazy loading, tri-state selection, drag & drop                                              | [demos](https://ogeui.com/components/tree-list)         |
| **Select Box & Tag Box** (`@oge-ui/inputs`) | WAI-ARIA combobox: search, grouping, custom values, avatars, multi-select chips                                                        | [demos](https://ogeui.com/components/inputs/select-box) |
| **Inputs** (`@oge-ui/inputs`)               | TextBox / TextArea / NumberBox on one field chrome, Signal Forms + reactive forms                                                      | [demos](https://ogeui.com/components/inputs)            |
| **Buttons** (`@oge-ui/buttons`)             | Async actions with auto loading, click guards, hold-to-confirm, groups, split buttons                                                  | [demos](https://ogeui.com/components/buttons)           |
| **Overlay** (`@oge-ui/overlay`)             | Flip-aware anchored popups, menus, tooltips, context menus                                                                             | [demos](https://ogeui.com/components/overlay)           |
| **Core** (`@oge-ui/core`)                   | Framework-free data engine: sorting/filtering/pivot/virtualization math                                                                | —                                                       |

Looking for the **Pivot Grid**? It lives in the separate, commercially
licensed [`@oge-ui/pivot`](https://www.npmjs.com/package/@oge-ui/pivot)
package (free for evaluation and development) and is installed on its own:
`npm install @oge-ui/pivot` —
[demos](https://ogeui.com/components/pivot-grid).

## Quick start

```ts
import { Component, signal } from '@angular/core';
import { OgeColumn, OgeGrid, OgeTagBox } from 'oge-ui';

@Component({
  selector: 'app-orders',
  imports: [OgeGrid, OgeColumn, OgeTagBox],
  template: `
    <oge-tag-box label="Regions" [items]="regions" [searchEnabled]="true" [(value)]="selected" />

    <oge-grid [data]="orders()" keyField="id" [filterRow]="true">
      <oge-column field="product" caption="Product" />
      <oge-column field="amount" caption="Amount" dataType="number" />
    </oge-grid>
  `,
})
export class Orders {
  readonly regions = ['EMEA', 'APAC', 'Americas'];
  readonly selected = signal<readonly unknown[]>(['EMEA']);
  readonly orders = signal([{ id: 1, product: 'Aurora Display', amount: 1249 }]);
}
```

No modules, no forms boilerplate — `[(value)]` binds straight to a `signal()`;
the same editors also plug into Signal Forms (`[formField]`) and reactive
forms (`formControl`).

## Why the umbrella?

- **Zero decision fatigue** — one `npm install`, every component importable
  from `'oge-ui'`.
- **Versions always in sync** — the umbrella pins every `@oge-ui/*` package to
  the exact same release.
- **Still tree-shakeable** — everything is standalone ESM with
  `sideEffects: false`; unused components never reach your bundle.
- **Not a lock-in** — the scoped packages remain the canonical à-la-carte
  path (`npm install @oge-ui/grid`) when you want the smallest possible
  dependency tree.

## Theming

One set of CSS design tokens drives every component:

```css
:root {
  --oge-accent: #6366f1;
  --oge-radius: 8px;
}
```

Bundled bridges: **dark** (add `.oge-theme-dark` to any ancestor),
**Tailwind** and **Bootstrap** —
[styling guide](https://ogeui.com/getting-started/styling).
All user-facing strings (aria labels included) are overridable via
`provideOge<X>Config()` —
[localization guide](https://ogeui.com/getting-started/localization).

## Good to know

- Requires **Angular ≥ 22** (standalone components, signals, zoneless).
- Excel/PDF export libraries (`exceljs`, `jspdf`) are **optional peers**:
  nothing is installed, bundled or executed unless you opt in.
- MIT licensed — and the umbrella and every package in it will stay MIT.
  The commercial `@oge-ui/pivot` package is not included.
  Source: [github.com/kaya2m/oge-ui](https://github.com/kaya2m/oge-ui).
