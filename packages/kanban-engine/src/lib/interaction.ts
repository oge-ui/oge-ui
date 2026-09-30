/**
 * The board's interaction machines as pure functions over the grouped board:
 * locating a card, arrow-key roving, the Ctrl+Arrow keyboard move twin of the
 * drag, the drag state's placeholder/shift arithmetic, and the move pipeline
 * (plan → cancelable event → commit onto the working set). A render layer
 * only wires events and state to these. Pure.
 */
import {
  orderBetween,
  renumberPatches,
  withFieldValue,
  type KanbanCard,
  type KanbanColumnDef,
  type KanbanSwimlane,
  type ResolvedKanbanFields,
} from './board-model';
import { isKanbanLegalTarget } from './board-view';

/** Where a card sits in the grouped board. */
export interface KanbanCardPosition {
  readonly laneIndex: number;
  readonly columnIndex: number;
  readonly cardIndex: number;
}

/** Finds a card by key in the grouped board. */
export function findKanbanCard<T>(
  lanes: readonly KanbanSwimlane<T>[],
  key: unknown,
): KanbanCardPosition | null {
  for (let laneIndex = 0; laneIndex < lanes.length; laneIndex++) {
    const columns = lanes[laneIndex].columns;
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
      const cardIndex = columns[columnIndex].cards.findIndex(
        (card) => card.key === key,
      );
      if (cardIndex >= 0) return { laneIndex, columnIndex, cardIndex };
    }
  }
  return null;
}

function firstCardFrom<T>(
  lane: KanbanSwimlane<T>,
  start: number,
  step: 1 | -1,
  isCollapsed: (key: string) => boolean,
): KanbanCard<T> | undefined {
  for (let i = start; i >= 0 && i < lane.columns.length; i += step) {
    if (isCollapsed(lane.columns[i].column.key)) continue;
    const cards = lane.columns[i].cards;
    if (cards.length > 0) return cards[0];
  }
  return undefined;
}

/**
 * The card an unmodified navigation key moves focus to: ArrowUp/Down within
 * the column, ArrowLeft/Right to the first card of the nearest non-empty,
 * non-collapsed column, Home/End within the column. `undefined` = the key is
 * not a navigation key here (or there is nowhere to go).
 */
export function kanbanNavigationTarget<T>(
  lanes: readonly KanbanSwimlane<T>[],
  position: KanbanCardPosition,
  key: string,
  isCollapsed: (key: string) => boolean,
): KanbanCard<T> | undefined {
  const { laneIndex, columnIndex, cardIndex } = position;
  const lane = lanes[laneIndex];
  switch (key) {
    case 'ArrowDown':
      return lane.columns[columnIndex].cards[cardIndex + 1];
    case 'ArrowUp':
      return lane.columns[columnIndex].cards[cardIndex - 1];
    case 'ArrowRight':
      return firstCardFrom(lane, columnIndex + 1, +1, isCollapsed);
    case 'ArrowLeft':
      return firstCardFrom(lane, columnIndex - 1, -1, isCollapsed);
    case 'Home':
      return lane.columns[columnIndex].cards[0];
    case 'End': {
      const cards = lane.columns[columnIndex].cards;
      return cards[cards.length - 1];
    }
    default:
      return undefined;
  }
}

/** Where a Ctrl+Arrow keyboard move sends the card. */
export interface KanbanKeyboardMove {
  readonly toColumn: string;
  readonly toIndex: number;
}

/**
 * Ctrl+Arrow: the exact keyboard twin of the drag — up/down reorders within
 * the column, left/right moves to the nearest non-collapsed legal column at
 * the same position. `null` = no move (edge, or an illegal/absent target).
 */
export function kanbanKeyboardMove<T>(
  lanes: readonly KanbanSwimlane<T>[],
  columns: readonly KanbanColumnDef[],
  card: KanbanCard<T>,
  position: KanbanCardPosition,
  key: string,
  isCollapsed: (key: string) => boolean,
): KanbanKeyboardMove | null {
  const lane = lanes[position.laneIndex];
  const cellCards = lane.columns[position.columnIndex].cards;
  switch (key) {
    case 'ArrowUp':
      if (position.cardIndex === 0) return null;
      return { toColumn: card.column, toIndex: position.cardIndex - 1 };
    case 'ArrowDown':
      if (position.cardIndex >= cellCards.length - 1) return null;
      return { toColumn: card.column, toIndex: position.cardIndex + 1 };
    case 'ArrowLeft':
    case 'ArrowRight': {
      const step = key === 'ArrowRight' ? 1 : -1;
      let columnIndex = position.columnIndex + step;
      while (
        columnIndex >= 0 &&
        columnIndex < lane.columns.length &&
        (isCollapsed(lane.columns[columnIndex].column.key) ||
          !isKanbanLegalTarget(
            columns,
            card.column,
            lane.columns[columnIndex].column.key,
          ))
      ) {
        columnIndex += step;
      }
      if (columnIndex < 0 || columnIndex >= lane.columns.length) return null;
      const target = lane.columns[columnIndex];
      return {
        toColumn: target.column.key,
        toIndex: Math.min(position.cardIndex, target.cards.length),
      };
    }
    default:
      return null;
  }
}

/** The drop target of a drag in flight. */
export interface KanbanDragTarget {
  readonly lane: string | null;
  readonly column: string;
  readonly index: number;
}

/** A card drag in flight. */
export interface KanbanDragState<T = unknown> {
  readonly card: KanbanCard<T>;
  readonly column: KanbanColumnDef;
  readonly fromLane: string | null;
  readonly fromIndex: number;
  /** Card box size, so the lifted preview matches the original. */
  readonly width: number;
  readonly height: number;
  /** Pointer offset within the card at grab time. */
  readonly grabX: number;
  readonly grabY: number;
  /** Current pointer position (viewport). */
  readonly x: number;
  readonly y: number;
  readonly target: KanbanDragTarget | null;
}

/** The placeholder slot for a cell, or `null` when it is not the drop target. */
export function kanbanDropIndex<T>(
  drag: KanbanDragState<T> | null,
  lane: string | null,
  column: string,
): number | null {
  const target = drag?.target;
  if (
    target === null ||
    target === undefined ||
    target.lane !== lane ||
    target.column !== column
  ) {
    return null;
  }
  return target.index;
}

/**
 * Whether a rendered card slides down to open the placeholder gap. The
 * comparison runs in "display" coordinates — the dragged card has left the
 * flow, so cards after it in the same cell sit one slot earlier.
 */
export function isKanbanCardShifted<T>(
  drag: KanbanDragState<T> | null,
  lane: string | null,
  columnKey: string,
  absoluteIndex: number,
  card: KanbanCard<T>,
): boolean {
  const target = drag?.target;
  if (
    drag === null ||
    target === null ||
    target === undefined ||
    target.lane !== lane ||
    target.column !== columnKey ||
    drag.card.key === card.key
  ) {
    return false;
  }
  let displayIndex = absoluteIndex;
  if (
    drag.fromLane === lane &&
    drag.card.column === columnKey &&
    drag.fromIndex < absoluteIndex
  ) {
    displayIndex -= 1;
  }
  return displayIndex >= target.index;
}

/** A validated move, ready for the cancelable `cardMoving` event. */
export interface KanbanMovePlan<T> {
  readonly card: KanbanCard<T>;
  readonly fromIndex: number;
  readonly toColumn: string;
  readonly toSwimlane: string | null;
  /** Insertion index into `cellCards`. */
  readonly toIndex: number;
  /** The target cell's cards, the moved card excluded. */
  readonly cellCards: readonly KanbanCard<T>[];
}

/**
 * Resolves `moveCard(key, toColumn, toIndex?, toSwimlane?)` against the
 * board: the target lane (default: the card's own), the target cell, the
 * clamped insertion index (default: append). `null` = nothing to do — an
 * unknown key or column, or a drop exactly where the card started.
 */
export function planKanbanMove<T>(
  lanes: readonly KanbanSwimlane<T>[],
  key: unknown,
  toColumn: string,
  toIndex?: number,
  toSwimlane?: string | null,
): KanbanMovePlan<T> | null {
  const position = findKanbanCard(lanes, key);
  if (position === null) return null;
  const lane = lanes[position.laneIndex];
  const card = lane.columns[position.columnIndex].cards[position.cardIndex];
  const targetLaneKey = toSwimlane !== undefined ? toSwimlane : lane.key;
  const targetLane = lanes.find((entry) => entry.key === targetLaneKey) ?? lane;
  const targetCell = targetLane.columns.find(
    (cell) => cell.column.key === toColumn,
  );
  if (targetCell === undefined) return null;
  const sameCell =
    card.column === toColumn && (card.swimlane ?? null) === targetLaneKey;
  const cellCards = sameCell
    ? targetCell.cards.filter((entry) => entry.key !== card.key)
    : targetCell.cards;
  const index = Math.max(
    0,
    Math.min(toIndex ?? cellCards.length, cellCards.length),
  );
  if (sameCell && index === position.cardIndex) return null;
  return {
    card,
    fromIndex: position.cardIndex,
    toColumn,
    toSwimlane: targetLaneKey,
    toIndex: index,
    cellCards,
  };
}

/** The working set after a move, and the moved item hosts persist. */
export interface KanbanMoveCommit<T> {
  readonly store: readonly T[];
  readonly moved: T;
}

/**
 * Applies a validated move to the working set and returns the updated item
 * (what `cardMoved` hands to hosts for persistence). With an `orderExpr` the
 * moved item gets a midpoint order (sequential renumber of the cell when the
 * midpoint has no room); without one the store array itself is reordered,
 * because the array order is the board order.
 */
export function commitKanbanMove<T>(
  store: readonly T[],
  plan: KanbanMovePlan<T>,
  fields: ResolvedKanbanFields<T>,
  options: { readonly hasSwimlanes: boolean; readonly hasOrder: boolean },
): KanbanMoveCommit<T> {
  const { card, cellCards, toColumn, toSwimlane, toIndex: index } = plan;
  const names = fields.fieldNames;
  let moved = card.source;
  if (names.column !== null) {
    moved = withFieldValue(moved, names.column, toColumn);
  }
  if (options.hasSwimlanes && names.swimlane !== null && toSwimlane !== null) {
    moved = withFieldValue(moved, names.swimlane, toSwimlane);
  }
  if (options.hasOrder && names.order !== null) {
    const prev = cellCards[index - 1];
    const next = cellCards[index];
    const order = orderBetween(
      prev !== undefined ? (prev.order ?? prev.sourceIndex) : null,
      next !== undefined ? (next.order ?? next.sourceIndex) : null,
    );
    if (order !== null) {
      const updated = withFieldValue(moved, names.order, order);
      return {
        store: store.map((entry) => (entry === card.source ? updated : entry)),
        moved: updated,
      };
    }
    // no midpoint room: renumber the whole cell sequentially
    // (the moved card enters under its original source, so the patch below
    // lands on top of the column/swimlane write-back instead of beside it)
    const reordered = [...cellCards];
    reordered.splice(index, 0, card);
    const patchBySource = new Map<T, T>([[card.source, moved]]);
    for (const [entry, orderValue] of renumberPatches(reordered)) {
      const base = patchBySource.get(entry.source) ?? entry.source;
      patchBySource.set(
        entry.source,
        withFieldValue(base, names.order, orderValue),
      );
    }
    return {
      store: store.map((entry) => patchBySource.get(entry) ?? entry),
      moved: patchBySource.get(card.source) ?? moved,
    };
  }
  // array order is the board order: reorder the store itself
  const rest = store.filter((entry) => entry !== card.source);
  const anchor = cellCards[index];
  const anchorIndex =
    anchor !== undefined
      ? rest.indexOf(anchor.source)
      : cellCards.length > 0
        ? rest.indexOf(cellCards[cellCards.length - 1].source) + 1
        : rest.length;
  const next = [...rest];
  next.splice(anchorIndex < 0 ? rest.length : anchorIndex, 0, moved);
  return { store: next, moved };
}

/** Toggles `key` in a collapsed-keys list. */
export function toggleKanbanKey(
  keys: readonly string[],
  key: string,
): string[] {
  return keys.includes(key)
    ? keys.filter((entry) => entry !== key)
    : [...keys, key];
}

/** The live column-order preview of a header drag at `toIndex`. */
export function kanbanColumnOrderPreview(
  baseOrder: readonly string[],
  fromIndex: number,
  toIndex: number,
  key: string,
): string[] {
  const next = [...baseOrder];
  next.splice(fromIndex, 1);
  next.splice(toIndex, 0, key);
  return next;
}

/**
 * The column the "+ Add column" composer creates from a typed name, or
 * `null` when the name is blank or already a visible column's key (the
 * composer then just closes).
 */
export function kanbanNewColumn(
  name: string,
  columns: readonly KanbanColumnDef[],
): KanbanColumnDef | null {
  const key = name.trim();
  if (key === '') return null;
  if (columns.some((column) => column.key === key)) return null;
  return { key, title: key };
}

/**
 * The column the toolbar's add button opens the dialog into: the first
 * visible column that accepts new cards and is expanded, else the first
 * column, else `''`.
 */
export function kanbanToolbarAddColumn(
  columns: readonly KanbanColumnDef[],
  canAddTo: (column: KanbanColumnDef) => boolean,
  isCollapsed: (key: string) => boolean,
): string {
  const first = columns.find(
    (column) => canAddTo(column) && !isCollapsed(column.key),
  );
  return first?.key ?? columns[0]?.key ?? '';
}

/**
 * Whether the built-in context menu opens (otherwise the browser's native
 * menu stays): a card menu needs an edit or delete capability; a column
 * menu always has its collapse toggle.
 */
export function isKanbanMenuAvailable(
  hasCard: boolean,
  hasColumn: boolean,
  caps: { readonly canUpdate: boolean; readonly canDelete: boolean },
): boolean {
  return hasCard ? caps.canUpdate || caps.canDelete : hasColumn;
}
