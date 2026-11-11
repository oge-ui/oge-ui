import { escapeCsvCell } from '@oge-ui/core';

/**
 * Rows dragged out of a grid with the browser's own drag and drop
 * (`rowDragExternal`) — onto a chat box, an editor, a desktop app or any
 * drop zone of the page. Shared by both grid render layers.
 */

/** The MIME type carrying the dragged rows as JSON, for drop zones of the page. */
export const OGE_GRID_ROWS_MIME = 'application/x-oge-grid-rows+json';

/** One column of the plain-text payload. */
export interface OgeRowDragOutColumn<T> {
  readonly caption: string;
  /** The cell text as the grid shows it. */
  readonly text: (row: T) => string;
}

/**
 * The rows an external drag carries: the whole selection when the grabbed
 * row is part of it, else that row alone.
 */
export function ogeRowDragOutRows<T, K>(
  grabbed: T,
  grabbedKey: K,
  selected: ReadonlySet<K>,
  rows: readonly T[],
  keyOf: (row: T, index: number) => K,
): readonly T[] {
  if (!selected.has(grabbedKey) || selected.size < 2) return [grabbed];
  const out = rows.filter((row, index) => selected.has(keyOf(row, index)));
  return out.length ? out : [grabbed];
}

/**
 * Writes the default payload of an external row drag:
 * - `text/plain`: the rows as TSV under a caption line, cells as the grid
 *   shows them, guarded against spreadsheet formulas like the CSV export;
 * - {@link OGE_GRID_ROWS_MIME} and `application/json`: the row objects.
 *
 * `items` feed the text columns (a host may pass its row nodes); `rows`
 * are the objects serialized, `items` themselves by default. The
 * `rowDragStart` handler runs after this and may replace any of it
 * (`setData` again) or add its own types.
 */
export function ogeWriteRowDragData<I>(
  transfer: DataTransfer,
  items: readonly I[],
  columns: readonly OgeRowDragOutColumn<I>[],
  rows: readonly unknown[] = items,
): void {
  const line = (cells: readonly string[]) =>
    cells.map((cell) => escapeCsvCell(cell, '\t', true)).join('\t');
  const text = [
    line(columns.map((column) => column.caption)),
    ...items.map((item) => line(columns.map((column) => column.text(item)))),
  ].join('\r\n');
  transfer.effectAllowed = 'copy';
  transfer.setData('text/plain', text);
  try {
    const json = JSON.stringify(rows);
    transfer.setData(OGE_GRID_ROWS_MIME, json);
    transfer.setData('application/json', json);
  } catch {
    // rows that do not serialize (cycles, bigint) travel as text only
  }
}
