/**
 * Multi-card selection and the multi-card move: Ctrl/Shift click and the
 * keyboard (Ctrl+A in a column, Ctrl+Space, Shift+Arrow) decide the next
 * selection; a drag or Ctrl+Arrow of a selected card carries every selected
 * card, inserted consecutively before one anchor. Pure.
 */
import type { KanbanCard, KanbanSwimlane } from './board-model';
import { findKanbanCard } from './interaction';

/** `selectionMode`: plain single selection, or Ctrl/Shift multi-select. */
export type OgeKanbanSelectionMode = 'single' | 'multiple';

/** The selection after an interaction. */
export interface KanbanSelection {
  /** Every selected card key, in board order. */
  readonly keys: readonly unknown[];
  /** The range anchor (the last plainly or Ctrl-clicked card). */
  readonly anchor: unknown;
}

/** Modifier state of a selecting click / key. */
export interface KanbanSelectModifiers {
  /** Ctrl (or ⌘): toggle the card in or out. */
  readonly toggle: boolean;
  /** Shift: select the range from the anchor within the anchor's cell. */
  readonly range: boolean;
}

/** Every card key in board order (lane → column → cell order). */
export function kanbanBoardOrder<T>(
  lanes: readonly KanbanSwimlane<T>[],
): unknown[] {
  const keys: unknown[] = [];
  for (const lane of lanes) {
    for (const cell of lane.columns) {
      for (const card of cell.cards) keys.push(card.key);
    }
  }
  return keys;
}

/** Sorts keys into board order, dropping keys no longer on the board. */
export function kanbanOrderKeys<T>(
  lanes: readonly KanbanSwimlane<T>[],
  keys: readonly unknown[],
): unknown[] {
  const wanted = new Set(keys);
  return kanbanBoardOrder(lanes).filter((key) => wanted.has(key));
}

/**
 * The selection after clicking `key`. Single mode (or no modifier) selects
 * exactly the card; Ctrl toggles it; Shift selects the anchor's cell range
 * up to the card (falls back to the card alone across cells).
 */
export function kanbanSelectCard<T>(
  lanes: readonly KanbanSwimlane<T>[],
  current: KanbanSelection,
  key: unknown,
  modifiers: KanbanSelectModifiers,
  mode: OgeKanbanSelectionMode,
): KanbanSelection {
  if (mode === 'single' || (!modifiers.toggle && !modifiers.range)) {
    return { keys: [key], anchor: key };
  }
  if (modifiers.range && current.anchor !== null) {
    const anchorPos = findKanbanCard(lanes, current.anchor);
    const keyPos = findKanbanCard(lanes, key);
    if (
      anchorPos !== null &&
      keyPos !== null &&
      anchorPos.laneIndex === keyPos.laneIndex &&
      anchorPos.columnIndex === keyPos.columnIndex
    ) {
      const cards = lanes[keyPos.laneIndex].columns[keyPos.columnIndex].cards;
      const from = Math.min(anchorPos.cardIndex, keyPos.cardIndex);
      const to = Math.max(anchorPos.cardIndex, keyPos.cardIndex);
      const range = cards.slice(from, to + 1).map((card) => card.key);
      const base = modifiers.toggle ? current.keys : [];
      return {
        keys: kanbanOrderKeys(lanes, [...base, ...range]),
        anchor: current.anchor,
      };
    }
    return { keys: [key], anchor: key };
  }
  // Ctrl: toggle
  const selected = current.keys.includes(key);
  const keys = selected
    ? current.keys.filter((entry) => entry !== key)
    : kanbanOrderKeys(lanes, [...current.keys, key]);
  return { keys, anchor: key };
}

/** Ctrl+A on a card: every card of its cell (the column within the lane). */
export function kanbanSelectCell<T>(
  lanes: readonly KanbanSwimlane<T>[],
  key: unknown,
): KanbanSelection | null {
  const position = findKanbanCard(lanes, key);
  if (position === null) return null;
  const cards = lanes[position.laneIndex].columns[position.columnIndex].cards;
  return { keys: cards.map((card) => card.key), anchor: key };
}

/** The cards a drag or Ctrl+Arrow of `card` carries, in board order. */
export function kanbanCarriedCards<T>(
  lanes: readonly KanbanSwimlane<T>[],
  card: KanbanCard<T>,
  selected: readonly unknown[],
): KanbanCard<T>[] {
  if (selected.length < 2 || !selected.includes(card.key)) return [card];
  const wanted = new Set(selected);
  const carried: KanbanCard<T>[] = [];
  for (const lane of lanes) {
    for (const cell of lane.columns) {
      for (const entry of cell.cards) {
        if (wanted.has(entry.key)) carried.push(entry);
      }
    }
  }
  return carried;
}

/**
 * The anchor a multi-card move inserts before: the card at `index` of the
 * target cell once the moved cards are taken out (`null` = append). The
 * `index` is relative to the cell without `excludeKey` — the dragged card —
 * which is how the drag hit-test and the keyboard move count.
 */
export function kanbanMultiMoveAnchor<T>(
  cellCards: readonly KanbanCard<T>[],
  index: number,
  movingKeys: readonly unknown[],
  excludeKey: unknown,
): unknown {
  const flow = cellCards.filter((card) => card.key !== excludeKey);
  const moving = new Set(movingKeys);
  for (let i = Math.max(0, index); i < flow.length; i++) {
    if (!moving.has(flow[i].key)) return flow[i].key;
  }
  return null;
}

/**
 * The insertion index of one moved card in its target cell (the moved card
 * itself excluded): before `anchor`, or at the end when the anchor is
 * `null` or gone.
 */
export function kanbanAnchorIndex<T>(
  cellCards: readonly KanbanCard<T>[],
  anchor: unknown,
  movedKey: unknown,
): number {
  const flow = cellCards.filter((card) => card.key !== movedKey);
  if (anchor === null) return flow.length;
  const index = flow.findIndex((card) => card.key === anchor);
  return index < 0 ? flow.length : index;
}

/** Keyboard selection shortcuts a focused card understands. */
export type KanbanSelectionShortcut =
  'select-cell' | 'toggle' | 'extend-up' | 'extend-down' | 'clear';

/** Decides a selection shortcut from a card keydown, or `null`. */
export function kanbanSelectionShortcut(
  event: {
    readonly key: string;
    readonly ctrlKey: boolean;
    readonly metaKey: boolean;
    readonly shiftKey: boolean;
    readonly altKey: boolean;
  },
  mode: OgeKanbanSelectionMode,
  selectedCount: number,
): KanbanSelectionShortcut | null {
  if (mode !== 'multiple' || event.altKey) return null;
  const ctrl = event.ctrlKey || event.metaKey;
  if (ctrl && !event.shiftKey && (event.key === 'a' || event.key === 'A')) {
    return 'select-cell';
  }
  if (ctrl && event.key === ' ') return 'toggle';
  if (!ctrl && event.shiftKey && event.key === 'ArrowUp') return 'extend-up';
  if (!ctrl && event.shiftKey && event.key === 'ArrowDown') {
    return 'extend-down';
  }
  if (!ctrl && event.key === 'Escape' && selectedCount > 1) return 'clear';
  return null;
}
