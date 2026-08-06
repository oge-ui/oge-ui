# oge-ui

One-install umbrella for the **OGE Angular UI suite** — signal-based,
zoneless, themeable components for data-heavy apps.

**Docs & live demos: [ogeui.com](https://ogeui.com)**

```sh
npm install oge-ui
```

This pulls in and re-exports every scoped package:

| Package                                                                | Contents                                                                    |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`@oge-ui/grid`](https://www.npmjs.com/package/@oge-ui/grid)           | Virtualized Data Grid: sorting, filtering, grouping, editing, master-detail |
| [`@oge-ui/tree-list`](https://www.npmjs.com/package/@oge-ui/tree-list) | Hierarchical grid with lazy loading, tri-state selection, drag & drop       |
| [`@oge-ui/pivot`](https://www.npmjs.com/package/@oge-ui/pivot)         | Pivot Grid: rows × columns × measures with totals and export                |
| [`@oge-ui/buttons`](https://www.npmjs.com/package/@oge-ui/buttons)     | Buttons, groups and drop-down/split buttons with async actions              |
| [`@oge-ui/inputs`](https://www.npmjs.com/package/@oge-ui/inputs)       | TextBox, TextArea, NumberBox and a searchable SelectBox (combobox)          |
| [`@oge-ui/overlay`](https://www.npmjs.com/package/@oge-ui/overlay)     | Anchored popups, menus, tooltips and context menus                          |
| [`@oge-ui/core`](https://www.npmjs.com/package/@oge-ui/core)           | Framework-free data engine (sorting/filtering/virtualization math)          |

## Usage

Import everything from one place:

```ts
import { Component, signal } from '@angular/core';
import { OgeButton, OgeColumn, OgeGrid, OgeSelectBox } from 'oge-ui';

@Component({
  selector: 'app-orders',
  imports: [OgeGrid, OgeColumn, OgeSelectBox, OgeButton],
  template: `
    <oge-select-box label="Region" [items]="regions" [(value)]="region" />
    <oge-grid [data]="orders()" keyField="id">
      <oge-column field="product" caption="Product" />
      <oge-column field="amount" caption="Amount" dataType="number" />
    </oge-grid>
  `,
})
export class Orders {
  readonly regions = ['EMEA', 'APAC', 'Americas'];
  readonly region = signal<unknown>(null);
  readonly orders = signal([{ id: 1, product: 'Aurora', amount: 1249 }]);
}
```

Everything is standalone, tree-shakeable (`sideEffects: false`) and typed —
unused components never reach your bundle.

## Prefer a smaller footprint?

The scoped packages remain the canonical, à-la-carte path — install only what
you use (`npm install @oge-ui/grid`); shared engines arrive as dependencies
automatically. Excel/PDF export libraries (`exceljs`, `jspdf`) are **optional
peers** either way: nothing is installed or bundled unless you opt in.

Requires Angular ≥ 22.
