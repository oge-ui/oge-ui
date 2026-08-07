# @oge-ui/core

The framework-agnostic engine behind the
[OGE](https://www.npmjs.com/package/@oge-ui/grid) UI components: plain
TypeScript, shipped as ESM, with zero dependency on Angular or any other
framework. The Angular grid (`@oge-ui/grid`) is a thin signal-based shell
over this package, and future framework adapters (React, ...) will share it.

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
- `buildCsv` (RFC 4180-style CSV) and a serializable `GridStateSnapshot`
  for state persistence.

## Installation

```sh
npm install @oge-ui/core
```

## License

MIT
