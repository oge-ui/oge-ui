/**
 * Drop-target resolution for the grid family's pointer drags (both grids,
 * both tree lists): which header, group panel, row, chooser row or group
 * chip sits under the pointer — read from the shared `.oge-*` markup and its
 * `data-*` attributes, so the two render layers resolve identically and the
 * drop runs the same command the keyboard alternative runs
 * (`grid-keyboard-moves.ts`).
 */

/** Hosts a drag target must belong to — nested detail grids are excluded. */
export const OGE_GRID_HOST_SELECTOR = '.oge-grid, .oge-tree-list';

/**
 * Controls inside a draggable source that keep their own press: a pointer
 * down on one of these never starts a drag.
 */
const DRAG_EXCLUDED =
  'button, input, select, textarea, a[href], [contenteditable="true"], .oge-resize-handle, .oge-header-filter-btn';

/**
 * The closest `selector` match of `hit` that belongs to `container`. With
 * `hostSelector`, the match must also have `container` as its nearest such
 * host (a header of a grid nested in a detail row is not this grid's).
 */
export function ogeOwnedClosest(
  hit: Element | null,
  selector: string,
  container: Element | null,
  hostSelector?: string,
): HTMLElement | null {
  if (!hit || !container) return null;
  const match = hit.closest<HTMLElement>(selector);
  if (!match || !container.contains(match)) return null;
  if (hostSelector && match.closest(hostSelector) !== container) return null;
  return match;
}

/**
 * The first `selector` match inside `container` whose `attribute` equals
 * `value` — the lookup a drop settle runs to find where the dropped item
 * rendered (`settleTo` of `beginPointerDragDrop`). The value is compared
 * as a string, never interpolated into a selector, so ids with quotes or
 * dots need no escaping. With `hostSelector`, the match must have
 * `container` as its nearest such host (rows of a nested grid are skipped).
 */
export function ogeOwnedElement(
  container: Element | null | undefined,
  selector: string,
  attribute: string,
  value: string | number | null | undefined,
  hostSelector?: string,
): HTMLElement | null {
  if (!container || value === null || value === undefined) return null;
  const wanted = String(value);
  for (const el of Array.from(
    container.querySelectorAll<HTMLElement>(selector),
  )) {
    if (el.getAttribute(attribute) !== wanted) continue;
    if (hostSelector && el.closest(hostSelector) !== container) continue;
    return el;
  }
  return null;
}

/**
 * True when a `pointerdown` on `target` belongs to a control nested inside
 * the draggable `source` (a chip's remove button, a header's filter button,
 * the resize separator) rather than to the source itself.
 */
export function isOgeDragExcludedTarget(
  target: EventTarget | null,
  source: Element | null,
): boolean {
  if (!(target instanceof Element) || !source) return false;
  const control = target.closest(DRAG_EXCLUDED);
  return control !== null && control !== source && source.contains(control);
}

/** What a dragged header can be dropped on. */
export type OgeGridHeaderDropTarget =
  { readonly kind: 'column'; readonly id: string } | { readonly kind: 'group' };

/**
 * The header-drag target under the pointer: another header cell (column
 * reorder, when enabled) or the group panel (group-by, when shown).
 */
export function resolveOgeHeaderDropTarget(
  hit: Element | null,
  host: Element | null,
  allow: { readonly reorder: boolean; readonly group: boolean },
): OgeGridHeaderDropTarget | null {
  const el = ogeOwnedClosest(
    hit,
    '.oge-group-panel, .oge-header-row > .oge-header-cell[data-colid]',
    host,
    OGE_GRID_HOST_SELECTOR,
  );
  if (!el) return null;
  if (el.classList.contains('oge-group-panel'))
    return allow.group ? { kind: 'group' } : null;
  const id = el.dataset['colid'];
  return allow.reorder && id ? { kind: 'column', id } : null;
}

/** The `data-rowindex` of the body row under the pointer, or `null`. */
export function resolveOgeRowDropIndex(
  hit: Element | null,
  host: Element | null,
): number | null {
  const row = ogeOwnedClosest(
    hit,
    '.oge-row[data-rowindex]',
    host,
    OGE_GRID_HOST_SELECTOR,
  );
  if (!row) return null;
  const index = Number(row.dataset['rowindex']);
  return Number.isInteger(index) ? index : null;
}

/**
 * The body row rendered at flat index `index` (`data-rowindex`) of `host`
 * — where a dropped row settles once the grid re-rendered; `null` when it
 * is scrolled out of the virtual window.
 */
export function ogeGridRowElement(
  host: Element | null | undefined,
  index: number,
): HTMLElement | null {
  if (index < 0) return null;
  return ogeOwnedElement(
    host,
    '.oge-row[data-rowindex]',
    'data-rowindex',
    index,
    OGE_GRID_HOST_SELECTOR,
  );
}

/**
 * Where a dragged header settles after a drop on `target`: its own header
 * cell at the new column position, or the group chip the drop on the group
 * panel created.
 */
export function ogeGridHeaderSettleElement(
  host: Element | null | undefined,
  target: OgeGridHeaderDropTarget,
  column: { readonly id: string; readonly field?: string | null },
): HTMLElement | null {
  if (target.kind === 'group')
    return ogeOwnedElement(
      host,
      '.oge-group-panel [data-group-chip]',
      'data-group-chip',
      column.field,
      OGE_GRID_HOST_SELECTOR,
    );
  return ogeOwnedElement(
    host,
    '.oge-header-row > .oge-header-cell[data-colid]',
    'data-colid',
    column.id,
    OGE_GRID_HOST_SELECTOR,
  );
}

/**
 * The value of `attribute` (a `data-*` name such as `data-chooser-id`) on
 * the closest element carrying it inside `container`.
 */
export function resolveOgeAttributeTarget(
  hit: Element | null,
  container: Element | null,
  attribute: string,
): string | null {
  const el = ogeOwnedClosest(hit, `[${attribute}]`, container);
  return el?.getAttribute(attribute) ?? null;
}

/**
 * Moves the grouping on `field` to `toIndex` through the slice's one-step
 * `move()` — the command the chip keyboard (`Ctrl+←/→`) runs, repeated.
 * Returns the final index, or -1 when nothing moved.
 */
export function ogeMoveGroupingTo(
  grouping: { move(field: string, direction: 1 | -1): number },
  fields: readonly string[],
  field: string,
  toIndex: number,
): number {
  let at = fields.indexOf(field);
  if (at < 0 || toIndex < 0 || toIndex >= fields.length || at === toIndex)
    return -1;
  const direction: 1 | -1 = toIndex > at ? 1 : -1;
  while (at !== toIndex) {
    const next = grouping.move(field, direction);
    if (next < 0) break;
    at = next;
  }
  return at;
}
