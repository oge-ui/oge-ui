# @oge-ui/core

The framework-agnostic engine behind the
[OGE](https://www.npmjs.com/package/@oge-ui/grid) UI components: plain
TypeScript, shipped as ESM, with zero dependency on Angular or any other
framework. The Angular and React grids (`@oge-ui/grid`,
`@oge-ui/react-grid`) are thin shells over this package and
[`@oge-ui/behavior`](https://www.npmjs.com/package/@oge-ui/behavior).

## What's inside

Data access starts with the `DataSource` contract. `LoadOptions` carries
skip/take, sort, filter, group and summary descriptors plus an `AbortSignal`,
and every load resolves to a `LoadResult` (with `GroupedItem` rows for
grouped loads). Three implementations ship in the box: `ArrayDataSource`
works in-memory with CRUD write-back and `push()` live updates,
`CustomDataSource` delegates to any remote fetch function, and
`ODataDataSource` targets OData v4 through `buildODataQuery`.

Filters are a closed, serializable `FilterExpr` tree with 14 operators and a
matching evaluator, so the same expression can be evaluated client-side or
translated for a server.

The row pipeline turns raw items into render-ready rows through pure, tested
steps: filter, then search, then a stable multi-key sort, then group,
aggregate and paginate. Its output is a flattened `RowNode` union
(`data | group | detail | summary | filler`) that any renderer can consume.

A few smaller pieces round it out:

- Virtualization math: a Fenwick-tree `OffsetTree` with O(log n)
  offset/index/height updates, plus `computeWindow`.
- Summaries: `sum`, `avg`, `min`, `max` and `count`, all null-safe.
- Grouping intervals: `GroupInterval` buckets dates by `'hour' | 'day' |
'week' | 'month' | 'quarter' | 'year'` and numbers by a bucket width; the
  `'datetime'` data type sits beside `'date'`.
- `buildCsv` (RFC 4180-style CSV) with `guardCsvFormula`, which neutralizes
  formula-leading cells (`=`, `+`, `-`, `@`, tab, CR, their full-width forms)
  after leading whitespace.
- Serializable `GridStateSnapshot` / tree-list / pivot snapshots for state
  persistence, and `parseStateJson` + `sanitizeGridStateSnapshot` /
  `sanitizeTreeListStateSnapshot` / `sanitizePivotGridStateSnapshot`, which
  drop unknown keys, reject `__proto__` / `constructor` / `prototype` at any
  depth, type-check every field and never throw — every `applyState()` runs
  restored state through them.
- Locale helpers: `resolveFirstDayOfWeek` and `resolveWeekendDays`
  (`Intl.Locale` week info, Saturday + Sunday fallback).
- The theme stylesheets under `@oge-ui/core/themes/` — `dark.css`,
  `high-contrast.css` (AAA contrast, forced-colors friendly), `tailwind.css`,
  `bootstrap.css`.

## Installation

```sh
npm install @oge-ui/core
```

## For AI coding assistants

The complete machine-readable API reference ships inside the package at
`node_modules/@oge-ui/core/llms.txt` — conventions, every documented member and
copy-pasteable demos in one file. Online: <https://www.ogeui.com/llms.txt> (index) and
<https://www.ogeui.com/llms-full.txt> (the whole suite).

## License

MIT
