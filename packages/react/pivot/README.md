# @oge-ui/react-pivot

React pivot grid from the [OGE UI](https://www.ogeui.com) suite — the React render
layer of [`@oge-ui/pivot`](https://www.npmjs.com/package/@oge-ui/pivot). Both
run the same framework-free engine
([`@oge-ui/pivot-engine`](https://www.npmjs.com/package/@oge-ui/pivot-engine))
and the same stylesheet, so a pivot behaves and looks identical in either
framework.

**Source-available commercial license** — free for evaluation and development,
a paid license is required for production use. See [LICENSE](LICENSE).

```sh
npm i @oge-ui/react-pivot
```

```tsx
'use client';

import { OgePivotGrid } from '@oge-ui/react-pivot';
import '@oge-ui/react-pivot/styles.css';

const fields = [
  { dataField: 'region', area: 'row' as const },
  { dataField: 'date', area: 'column' as const, groupInterval: 'year' as const },
  { dataField: 'amount', area: 'data' as const, summaryType: 'sum' as const },
];

export function Sales({ rows }: { rows: Sale[] }) {
  return <OgePivotGrid data={rows} fields={fields} />;
}
```

- Local rows or any remote `OgePivotStore` (pre-aggregated, abortable loads).
- Four drag & drop field areas, a field chooser (live or `onDemand` draft).
- Multi-level column headers, expand/collapse on both axes, sub and grand
  totals, percent-of / variation display modes and running totals.
- Header menus (sort, sort by summary, value filter, remove, expand/collapse
  all) and measure menus (summary type, display mode).
- Two-axis virtual scrolling, roving-tabindex keyboard navigation.
- `stateKey` persistence through the same `OgeGridStateStorageProvider` the
  React grid uses; `state()` / `applyState()` on the `ref` handle.
- `getCsv()` / `exportCsv()` on the handle, and
  `@oge-ui/react-pivot/export-excel` for `.xlsx` (optional `exceljs` peer).
- `<OgePivotMessagesProvider>` localizes every string.

Docs and live demos: https://www.ogeui.com/components/pivot-grid (pick React in the
header switch).
