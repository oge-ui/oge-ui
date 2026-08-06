# @oge-ui/core

Framework-agnostic engine behind the [OGE](https://www.npmjs.com/package/@oge-ui/grid) UI components. **Zero Angular (or any framework) dependency** — plain TypeScript, ESM.

## What's inside

- **DataSource contract** — `DataSource`, `LoadOptions` (skip/take/sort/filter/group/summary, `AbortSignal`), `LoadResult`, `GroupedItem`
- **Implementations** — `ArrayDataSource` (in-memory, CRUD write-back, `push()` live updates), `CustomDataSource` (remote fetch delegate) and `ODataDataSource` (`buildODataQuery`, OData v4)
- **Filtering** — closed, serializable `FilterExpr` tree (14 operators) + evaluator
- **Row pipeline** — pure, tested steps: filter → search → sort (stable, multi-key) → group → aggregate → paginate
- **Flattened row model** — `RowNode` union (`data | group | detail | summary | filler`) feeding any renderer
- **Virtualization math** — Fenwick-tree `OffsetTree` (O(log n) offset/index/height updates) + `computeWindow`
- **Summaries** — `sum · avg · min · max · count`, null-safe
- **CSV** — RFC 4180-style `buildCsv`
- **State** — serializable `GridStateSnapshot`

The Angular grid (`@oge-ui/grid`) is a thin signal-based shell over this engine; future framework adapters (React, …) will share it.

## Installation

```sh
npm install @oge-ui/core
```

## License

MIT
