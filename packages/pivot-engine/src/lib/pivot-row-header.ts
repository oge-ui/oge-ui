import type { OgePivotAxisLine } from './pivot-types';

/**
 * How row headers lay out the row fields:
 *
 * - `'compact'` (default) — one column, each level indented under its parent;
 * - `'outline'` — one column per row field, a label only in its own field's
 *   column (parents on their own line above their children);
 * - `'tabular'` — one column per row field with the ancestors' labels
 *   repeated on every line, so each line reads on its own (and copies or
 *   exports as a flat table).
 *
 * The keyboard model is the same in all three: the row header stays one
 * `rowheader` cell per line; the field columns are its inner layout.
 */
export type OgePivotRowHeaderLayout = 'compact' | 'outline' | 'tabular';

/**
 * The per-field label columns of every row line, or `null` for the compact
 * layout. `depth` is the number of row fields (at least one column).
 */
export function pivotRowHeaderSegments(
  lines: readonly OgePivotAxisLine[],
  layout: OgePivotRowHeaderLayout,
  depth: number,
): (readonly string[])[] | null {
  if (layout === 'compact') return null;
  const width = Math.max(1, depth);
  const stack: string[] = [];
  return lines.map((line) => {
    const cells = new Array<string>(width).fill('');
    if (line.isGrandTotal) {
      cells[0] = line.text;
      return cells;
    }
    const level = Math.min(width - 1, Math.max(0, line.level));
    stack[level] = line.text;
    stack.length = level + 1;
    if (layout === 'outline') {
      cells[level] = line.text;
    } else {
      for (let i = 0; i <= level; i++) cells[i] = stack[i] ?? '';
    }
    return cells;
  });
}
