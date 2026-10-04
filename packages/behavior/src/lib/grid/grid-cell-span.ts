import type { RowNode } from '@oge-ui/core';

/**
 * Row and column spanning (`cellSpan` / a column's `mergeCells`), shared by
 * both grid render layers (ADR 0001).
 *
 * A span is computed over the *rendered* flat row list, so it never crosses a
 * group, detail or summary row and it follows sort, filter and paging. The
 * owner cell (top-start) carries `aria-rowspan` / `aria-colspan`; the cells it
 * covers are not cells any more — the keyboard machine routes into the owner
 * and steps over the covered area (`OgeGridKeyboardNavCore`'s `spans` hook).
 */

/** What `cellSpan` returns for a cell; omitted / `1` means no span. */
export interface OgeGridCellSpan {
  rowSpan?: number;
  colSpan?: number;
}

/** A resolved span: the owner's extent. */
export interface OgeGridSpanExtent {
  readonly rowSpan: number;
  readonly colSpan: number;
}

/** The span layout of one view, queried per cell by the templates and the keyboard. */
export interface OgeGridSpanLayout {
  /** The extent of an owner cell (spans > 1 only), else `null`. */
  extentOf(row: number, col: number): OgeGridSpanExtent | null;
  /** The owner of a covered cell, else `null` (owners and plain cells). */
  ownerOf(row: number, col: number): { row: number; col: number } | null;
  /** Whether any span exists. */
  readonly empty: boolean;
}

/** The column facts spanning reads. */
export interface OgeGridSpanColumn<T> {
  readonly field: string | undefined;
  readonly accessor: (row: T) => unknown;
  /** Merge vertically adjacent equal values of this column. */
  readonly mergeCells?: boolean;
}

/** Inputs of {@link computeOgeGridSpans}. */
export interface OgeGridSpanInput<T, C extends OgeGridSpanColumn<T>> {
  nodes: readonly RowNode<T>[];
  columns: readonly C[];
  /** Per-cell span callback; wins over `mergeCells` where both apply. */
  cellSpan?: (
    row: T,
    column: C,
    rowIndex: number,
  ) => OgeGridCellSpan | null | undefined;
}

/** The empty layout — what virtualized grids and span-free grids use. */
export const OGE_NO_SPANS: OgeGridSpanLayout = Object.freeze({
  extentOf: () => null,
  ownerOf: () => null,
  empty: true,
});

const sameValue = (a: unknown, b: unknown): boolean => {
  if (a instanceof Date && b instanceof Date)
    return a.getTime() === b.getTime();
  return Object.is(a, b) || (a == null && b == null);
};

/**
 * Builds the span layout: callback spans first (in row-major order — a cell
 * another span already covers is skipped), then `mergeCells` runs of equal
 * values per column. Every span is clamped to the run of consecutive data
 * rows it starts in and to the column count, and never overlaps an earlier
 * span (the overlap is truncated, not merged).
 */
export function computeOgeGridSpans<T, C extends OgeGridSpanColumn<T>>(
  input: OgeGridSpanInput<T, C>,
): OgeGridSpanLayout {
  const { nodes, columns, cellSpan } = input;
  const mergeable = columns.some((column) => column.mergeCells);
  if (!cellSpan && !mergeable) return OGE_NO_SPANS;
  const extents = new Map<string, OgeGridSpanExtent>();
  const owners = new Map<string, { row: number; col: number }>();
  const id = (row: number, col: number): string => `${row}:${col}`;
  const taken = (row: number, col: number): boolean =>
    extents.has(id(row, col)) || owners.has(id(row, col));
  /** Last row of the data-row run that contains `row`. */
  const runEnd = (row: number): number => {
    let end = row;
    while (end + 1 < nodes.length && nodes[end + 1].kind === 'data') end++;
    return end;
  };

  const place = (
    row: number,
    col: number,
    rowSpan: number,
    colSpan: number,
  ): void => {
    let rows = Math.max(1, Math.min(rowSpan, runEnd(row) - row + 1));
    let cols = Math.max(1, Math.min(colSpan, columns.length - col));
    // truncate against cells earlier spans already own
    for (let c = 1; c < cols; c++) {
      if (taken(row, col + c)) {
        cols = c;
        break;
      }
    }
    for (let r = 1; r < rows; r++) {
      let blocked = false;
      for (let c = 0; c < cols; c++)
        if (taken(row + r, col + c)) blocked = true;
      if (blocked) {
        rows = r;
        break;
      }
    }
    if (rows === 1 && cols === 1) return;
    extents.set(id(row, col), { rowSpan: rows, colSpan: cols });
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        if (r || c) owners.set(id(row + r, col + c), { row, col });
  };

  if (cellSpan) {
    for (let row = 0; row < nodes.length; row++) {
      const node = nodes[row];
      if (node.kind !== 'data') continue;
      for (let col = 0; col < columns.length; col++) {
        if (taken(row, col)) continue;
        const span = cellSpan(node.data, columns[col], row);
        if (!span) continue;
        place(row, col, span.rowSpan ?? 1, span.colSpan ?? 1);
      }
    }
  }
  if (mergeable) {
    columns.forEach((column, col) => {
      if (!column.mergeCells) return;
      let row = 0;
      while (row < nodes.length) {
        const node = nodes[row];
        if (node.kind !== 'data' || taken(row, col)) {
          row++;
          continue;
        }
        const value = column.accessor(node.data);
        let end = row;
        while (
          end + 1 < nodes.length &&
          nodes[end + 1].kind === 'data' &&
          !taken(end + 1, col) &&
          sameValue(
            column.accessor((nodes[end + 1] as { data: T }).data),
            value,
          )
        )
          end++;
        if (end > row && value != null && value !== '')
          place(row, col, end - row + 1, 1);
        row = end + 1;
      }
    });
  }
  if (!extents.size) return OGE_NO_SPANS;
  return {
    extentOf: (row, col) => extents.get(id(row, col)) ?? null,
    ownerOf: (row, col) => owners.get(id(row, col)) ?? null,
    empty: false,
  };
}
