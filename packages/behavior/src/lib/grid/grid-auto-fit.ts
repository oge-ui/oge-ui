import type { GroupRowNode, RowNode } from '@oge-ui/core';

/**
 * DOM-measuring helpers of the grid's layout polish — column auto-fit, the
 * overflow hint and sticky group rows — shared by both render layers
 * (ADR 0001). They read layout boxes and nothing else; no styles are written.
 */

/** Extra px an auto-fitted column gets beyond its widest content (subpixels, borders). */
export const OGE_AUTO_FIT_SLACK = 2;

/**
 * The width a column needs to show its header and the rendered cells without
 * truncation: the widest `scrollWidth` among them (cells clip with
 * `overflow: hidden`, so their scroll width is the natural content width
 * plus padding), plus a little slack. Only *rendered* cells count — a
 * virtualized grid fits to the visible window, like Excel's double-click.
 * Returns `null` when nothing could be measured (jsdom, a hidden grid).
 */
export function ogeMeasureAutoWidth(
  header: Element | null,
  cells: Iterable<Element>,
): number | null {
  let widest = 0;
  const measure = (element: Element): void => {
    const width = (element as HTMLElement).scrollWidth ?? 0;
    if (width > widest) widest = width;
  };
  if (header) measure(header);
  for (const cell of cells) measure(cell);
  return widest > 0 ? Math.ceil(widest) + OGE_AUTO_FIT_SLACK : null;
}

/** Whether an element's text is clipped (the overflow hint shows then). */
export function ogeIsTextTruncated(element: Element | null): boolean {
  if (!element) return false;
  const box = element as HTMLElement;
  return (
    box.scrollWidth > box.clientWidth + 1 ||
    box.scrollHeight > box.clientHeight + 1
  );
}

/**
 * The group rows a sticky group header shows for a scroll position: for the
 * first visible flat row, the chain of enclosing groups, outermost first. A
 * group row that is itself the first visible row is not repeated — it is
 * already on screen.
 */
export function ogeStickyGroupChain<T>(
  nodes: readonly RowNode<T>[],
  firstVisible: number,
): GroupRowNode[] {
  if (firstVisible <= 0 || firstVisible >= nodes.length) return [];
  const chain: GroupRowNode[] = [];
  const first = nodes[firstVisible];
  // the first visible row's own level bounds the ancestors we look for
  let level = first.kind === 'group' ? first.level : Number.POSITIVE_INFINITY;
  for (let index = firstVisible - 1; index >= 0 && level > 0; index--) {
    const node = nodes[index];
    if (node.kind !== 'group') continue;
    if (node.level < level) {
      chain.unshift(node);
      level = node.level;
    }
  }
  return chain;
}

/**
 * The first flat row whose box reaches below `top` (a viewport-relative y,
 * usually the header's bottom edge), by binary search over the rendered row
 * elements in DOM order — `rowIndex` reads each one's flat index. `-1` when
 * there are none.
 */
export function ogeFirstVisibleRow(
  rows: readonly Element[],
  top: number,
  rowIndex: (row: Element) => number,
): number {
  if (!rows.length) return -1;
  let lo = 0;
  let hi = rows.length - 1;
  let found = rows.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const rect = rows[mid].getBoundingClientRect();
    if (rect.bottom > top + 1) {
      found = mid;
      hi = mid - 1;
    } else lo = mid + 1;
  }
  return rowIndex(rows[found]);
}
