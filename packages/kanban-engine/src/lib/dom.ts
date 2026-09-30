/**
 * The board's DOM readers and writers — framework-free, over the shared
 * `.oge-kanban-*` markup both render layers emit: cell measurement for the
 * virtual windows, drag geometry measured once at drag start, the pointer →
 * drop-target resolution, one edge auto-scroll frame, header centers for the
 * column-reorder drag, and the focus/scroll/menu helpers. Only standard DOM
 * APIs; the pure arithmetic lives in `drag-math.ts`.
 */
import type { KanbanColumnDef, KanbanSwimlane } from './board-model';
import {
  isKanbanLegalTarget,
  kanbanCellKey,
  type KanbanCellScroll,
} from './board-view';
import {
  edgeScrollVelocity,
  hitTestCell,
  insertionIndexAt,
  type KanbanCellRect,
} from './drag-math';
import type { KanbanDragState, KanbanDragTarget } from './interaction';

/** `CSS.escape` with a jsdom-safe fallback for attribute selectors. */
export function kanbanCssEscape(value: string): string {
  return typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
    ? CSS.escape(value)
    : value.replace(/["\\]/g, '\\$&');
}

function laneOf(el: HTMLElement): string | null {
  const lane = el.getAttribute('data-lane');
  return lane === '' ? null : lane;
}

/**
 * Re-measures every rendered cell's viewport height; returns the updated
 * scroll-state map, or `null` when no height changed (so the host can skip
 * the state write).
 */
export function measureKanbanCells(
  host: HTMLElement,
  prev: ReadonlyMap<string, KanbanCellScroll>,
): Map<string, KanbanCellScroll> | null {
  const cells = host.querySelectorAll<HTMLElement>('.oge-kanban-cards');
  const next = new Map(prev);
  let changed = false;
  for (const el of Array.from(cells)) {
    const key = kanbanCellKey(laneOf(el), el.getAttribute('data-col') ?? '');
    const current = next.get(key);
    if (current?.height !== el.clientHeight) {
      next.set(key, { top: el.scrollTop, height: el.clientHeight });
      changed = true;
    }
  }
  return changed ? next : null;
}

/** Every droppable cell and the board's scroll origin, measured at drag start. */
export interface KanbanDragGeometry {
  readonly body: HTMLElement | null;
  readonly startScrollLeft: number;
  readonly startScrollTop: number;
  readonly cells: readonly KanbanCellRect[];
  readonly cellEls: readonly HTMLElement[];
}

/** Measures every droppable cell once at drag start (rects stay static). */
export function measureKanbanDragGeometry(
  host: HTMLElement,
): KanbanDragGeometry {
  const body = host.querySelector<HTMLElement>('.oge-kanban-body');
  const cellEls = Array.from(
    host.querySelectorAll<HTMLElement>('.oge-kanban-cards'),
  );
  const cells = cellEls.map((el): KanbanCellRect => {
    const rect = el.getBoundingClientRect();
    const inner = el.querySelector<HTMLElement>('.oge-kanban-cards-inner');
    const contentTop =
      inner !== null
        ? inner.getBoundingClientRect().top + el.scrollTop
        : rect.top;
    return {
      swimlane: laneOf(el),
      column: el.getAttribute('data-col') ?? '',
      rect: {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
      },
      contentTop,
    };
  });
  return {
    body,
    startScrollLeft: body?.scrollLeft ?? 0,
    startScrollTop: body?.scrollTop ?? 0,
    cells,
    cellEls,
  };
}

/** The dragged card's origin, as the target resolution needs it. */
export type KanbanDragOrigin<T> = Pick<
  KanbanDragState<T>,
  'card' | 'fromLane' | 'fromIndex'
>;

/**
 * Pointer → (lane, column, insertion index), in start-frame coordinates (the
 * board's scroll since drag start is added back). `null` = no legal cell
 * under the pointer; the caller keeps the previous target.
 */
export function resolveKanbanDragTarget<T>(
  geometry: KanbanDragGeometry,
  clientX: number,
  clientY: number,
  origin: KanbanDragOrigin<T>,
  lanes: readonly KanbanSwimlane<T>[],
  columns: readonly KanbanColumnDef[],
  slot: number,
): KanbanDragTarget | null {
  const scrollDX = (geometry.body?.scrollLeft ?? 0) - geometry.startScrollLeft;
  const scrollDY = (geometry.body?.scrollTop ?? 0) - geometry.startScrollTop;
  const x = clientX + scrollDX;
  const y = clientY + scrollDY;
  const cellIndex = hitTestCell(x, y, geometry.cells);
  if (cellIndex < 0) return null;
  const cell = geometry.cells[cellIndex];
  if (!isKanbanLegalTarget(columns, origin.card.column, cell.column)) {
    return null;
  }
  const el = geometry.cellEls[cellIndex];
  const lane = lanes.find((entry) => entry.key === cell.swimlane);
  const cards =
    lane?.columns.find((entry) => entry.column.key === cell.column)?.cards ??
    [];
  const sameCell =
    cell.swimlane === origin.fromLane && cell.column === origin.card.column;
  const index = insertionIndexAt(
    y,
    cell,
    el.scrollTop,
    slot,
    cards.length,
    sameCell ? origin.fromIndex : -1,
  );
  return { lane: cell.swimlane, column: cell.column, index };
}

/**
 * One edge auto-scroll frame: scrolls the board horizontally and the hovered
 * cell vertically when the pointer rests in an edge band. Returns whether
 * anything actually scrolled (then the host re-runs the hit-test at the
 * resting pointer position).
 */
export function kanbanAutoScrollStep<T>(
  geometry: KanbanDragGeometry,
  drag: KanbanDragState<T>,
): boolean {
  let scrolled = false;
  const body = geometry.body;
  if (body !== null) {
    const bodyRect = body.getBoundingClientRect();
    const vx = edgeScrollVelocity(drag.x, bodyRect.left, bodyRect.right);
    if (vx !== 0) {
      const before = body.scrollLeft;
      body.scrollLeft += vx;
      scrolled = scrolled || body.scrollLeft !== before;
    }
  }
  const target = drag.target;
  if (target !== null) {
    const cellIndex = geometry.cells.findIndex(
      (cell) => cell.swimlane === target.lane && cell.column === target.column,
    );
    const el = geometry.cellEls[cellIndex];
    if (el !== undefined) {
      const rect = geometry.cells[cellIndex].rect;
      const vy = edgeScrollVelocity(drag.y, rect.top, rect.bottom);
      if (vy !== 0) {
        const before = el.scrollTop;
        el.scrollTop += vy;
        scrolled = scrolled || el.scrollTop !== before;
      }
    }
  }
  return scrolled;
}

/**
 * Runs `step` on every animation frame until it returns `false` — the edge
 * auto-scroll loop, independent of pointer events so the board keeps
 * scrolling while the pointer rests at an edge. Returns the stop function.
 */
export function startKanbanFrameLoop(step: () => boolean): () => void {
  if (typeof requestAnimationFrame !== 'function') return () => undefined;
  let id: number | null = null;
  const tick = (): void => {
    if (!step()) {
      id = null;
      return;
    }
    id = requestAnimationFrame(tick);
  };
  id = requestAnimationFrame(tick);
  return () => {
    if (id !== null && typeof cancelAnimationFrame === 'function') {
      cancelAnimationFrame(id);
    }
    id = null;
  };
}

/** The header row's horizontal centers (column-reorder drag). */
export function kanbanHeaderCenters(host: HTMLElement): number[] {
  return Array.from(
    host.querySelectorAll<HTMLElement>('.oge-kanban-header-row > *'),
  ).map((el) => {
    const rect = el.getBoundingClientRect();
    return (rect.left + rect.right) / 2;
  });
}

/** Focuses the rendered card with `key` (no-op when it is not rendered). */
export function focusKanbanCard(host: HTMLElement, key: string): void {
  host
    .querySelector<HTMLElement>(
      `.oge-kanban-card[data-key="${kanbanCssEscape(key)}"]`,
    )
    ?.focus();
}

/** Writes a cell's scrollTop (keyboard scroll-into-view of a virtual card). */
export function scrollKanbanCell(
  host: HTMLElement,
  lane: string | null,
  column: string,
  top: number,
): void {
  const el = host.querySelector<HTMLElement>(
    `.oge-kanban-cards[data-lane="${kanbanCssEscape(lane ?? '')}"][data-col="${kanbanCssEscape(column)}"]`,
  );
  if (el !== null) el.scrollTop = top;
}

/** Focuses the first enabled item of the open context menu. */
export function focusFirstKanbanMenuItem(host: HTMLElement): void {
  host
    .querySelector<HTMLElement>('.oge-kanban-menu-item:not(:disabled)')
    ?.focus();
}

/** Moves focus one enabled menu item down/up (wrapping). */
export function stepKanbanMenuFocus(
  host: HTMLElement,
  key: 'ArrowDown' | 'ArrowUp',
): void {
  const items = Array.from(
    host.querySelectorAll<HTMLButtonElement>(
      '.oge-kanban-menu-item:not(:disabled)',
    ),
  );
  const active = host.ownerDocument.activeElement;
  const index = items.indexOf(active as HTMLButtonElement);
  const next =
    key === 'ArrowDown'
      ? items[(index + 1) % items.length]
      : items[(index - 1 + items.length) % items.length];
  next?.focus();
}
