/**
 * The board's view model: which columns show and in which order, the grid
 * tracks, per-column counts and WIP, legal move targets, the accessible
 * labels, the card chrome helpers (initials, due dates), the roving tab
 * stops and the per-cell virtual window. Every render layer derives its
 * markup from these, so the two layers cannot disagree about a board. Pure.
 */
import { ogeDateTimeFormat } from '@oge-ui/core';
import {
  deriveColumns,
  orderColumns,
  type KanbanCard,
  type KanbanColumnDef,
  type KanbanSwimlane,
} from './board-model';
import type { OgeKanbanBoardMessages } from './config';
import { computeColumnWindow, type KanbanColumnWindow } from './virtual-column';
import { wipState, type KanbanWipState } from './wip';

/** Vertical gap between cards (must match the SCSS slot math). */
export const KANBAN_CARD_GAP = 8;

/** Fallback cell viewport before the first measurement lands. */
export const KANBAN_DEFAULT_CELL_HEIGHT = 600;

/** Fallback card height when neither the instance nor the config sets one. */
export const KANBAN_DEFAULT_CARD_HEIGHT = 112;

/** Grid track of a collapsed column (the slim vertical pill). */
export const KANBAN_COLLAPSED_TRACK = '44px';

/** Inputs of {@link resolveKanbanColumns}. */
export interface KanbanColumnsInput<T> {
  /** The `columns` input/prop; empty or unset = derive from the data. */
  readonly declared: readonly KanbanColumnDef[] | undefined;
  /** Derived columns remembered for the component's lifetime. */
  readonly seenDerived: readonly KanbanColumnDef[];
  readonly cards: readonly KanbanCard<T>[];
  /** Columns created at runtime through the "+ Add column" affordance. */
  readonly runtime: readonly KanbanColumnDef[];
  /** A header drag's live order preview; wins over `columnOrder`. */
  readonly preview: readonly string[] | null;
  /** The persisted column order (empty = declared order). */
  readonly columnOrder: readonly string[];
}

/** The visible columns plus the derived set to remember, when it grew. */
export interface KanbanColumnsResult {
  readonly columns: KanbanColumnDef[];
  /**
   * Derived-mode keys accumulate for the component's lifetime, so a column
   * does not vanish the moment its last card leaves it. Non-null = the host
   * should store this as its new `seenDerived` (outside its render pass).
   */
  readonly nextSeenDerived: readonly KanbanColumnDef[] | null;
}

/**
 * The effective, ordered column list: declared columns, or the data's
 * distinct column keys accumulated for the board's lifetime; then the
 * runtime-added columns; then the live drag preview or the persisted order.
 */
export function resolveKanbanColumns<T>(
  input: KanbanColumnsInput<T>,
): KanbanColumnsResult {
  const declared = input.declared;
  let base: KanbanColumnDef[];
  let nextSeenDerived: KanbanColumnDef[] | null = null;
  if (declared !== undefined && declared.length > 0) {
    base = [...declared];
  } else {
    const seen = new Map(
      input.seenDerived.map((column) => [column.key, column]),
    );
    for (const column of deriveColumns(undefined, input.cards)) {
      if (!seen.has(column.key)) seen.set(column.key, column);
    }
    base = [...seen.values()];
    if (base.length !== input.seenDerived.length) nextSeenDerived = base;
  }
  const keys = new Set(base.map((column) => column.key));
  for (const column of input.runtime) {
    if (!keys.has(column.key)) base.push(column);
  }
  const order = input.columnOrder;
  return {
    columns: orderColumns(
      base,
      input.preview ?? (order.length > 0 ? order : undefined),
    ),
    nextSeenDerived,
  };
}

/** Card counts per column across all lanes (unfiltered — WIP is a data fact). */
export function kanbanColumnCounts<T>(
  cards: readonly KanbanCard<T>[],
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    counts.set(card.column, (counts.get(card.column) ?? 0) + 1);
  }
  return counts;
}

/** The column's WIP arithmetic from the board's counts. */
export function kanbanColumnWip(
  column: KanbanColumnDef,
  counts: ReadonlyMap<string, number>,
): KanbanWipState {
  return wipState(
    counts.get(column.key) ?? 0,
    column.wipLimit,
    column.minCount,
  );
}

/** A column's display title (falls back to its key). */
export function kanbanColumnTitle(column: KanbanColumnDef): string {
  return column.title ?? column.key;
}

/**
 * `grid-template-columns` of the header row and every lane: fixed tracks
 * keep headers legible (the board scrolls horizontally), collapsed columns
 * shrink to a pill, and the "+ Add column" ghost gets one more track.
 */
export function kanbanGridTemplate(
  columns: readonly KanbanColumnDef[],
  collapsed: readonly string[],
  columnWidth: number,
  withAddColumn: boolean,
): string {
  const width = `${columnWidth}px`;
  const tracks = columns.map((column) =>
    collapsed.includes(column.key) ? KANBAN_COLLAPSED_TRACK : width,
  );
  if (withAddColumn) tracks.push(width);
  return tracks.join(' ');
}

/**
 * Whether an interactive move (drag, keyboard, menu) may land a card from
 * `fromKey` in `toKey`: the source must allow dragging out, the target must
 * allow dropping in, and the source's `transitionColumns` (when set) must
 * list the target. Programmatic `moveCard` is deliberately not gated — the
 * app owns its own rules there.
 */
export function isKanbanLegalTarget(
  columns: readonly KanbanColumnDef[],
  fromKey: string,
  toKey: string,
): boolean {
  if (fromKey === toKey) return true;
  const from = columns.find((entry) => entry.key === fromKey);
  const to = columns.find((entry) => entry.key === toKey);
  if (to === undefined || to.allowDrop === false) return false;
  if (
    from?.transitionColumns !== undefined &&
    !from.transitionColumns.includes(toKey)
  ) {
    return false;
  }
  return true;
}

/** Move-to menu targets: every other legal visible column. */
export function kanbanMoveTargets(
  columns: readonly KanbanColumnDef[],
  fromKey: string,
): KanbanColumnDef[] {
  return columns.filter(
    (column) =>
      column.key !== fromKey &&
      isKanbanLegalTarget(columns, fromKey, column.key),
  );
}

/** Replaces each `{token}` (first occurrence) in a message template. */
export function formatKanbanMessage(
  template: string,
  tokens: Readonly<Record<string, string>>,
): string {
  let text = template;
  for (const [token, value] of Object.entries(tokens)) {
    text = text.replace(`{${token}}`, value);
  }
  return text;
}

/** A column list's accessible name (count, and WIP limit when set). */
export function kanbanCellLabel(
  messages: OgeKanbanBoardMessages,
  column: KanbanColumnDef,
  count: number,
  wip: KanbanWipState,
): string {
  return wip.limit !== null
    ? formatKanbanMessage(messages.columnLabelWip, {
        title: kanbanColumnTitle(column),
        count: String(count),
        limit: String(wip.limit),
      })
    : formatKanbanMessage(messages.columnLabel, {
        title: kanbanColumnTitle(column),
        count: String(count),
      });
}

/** A card's accessible name (title + the column it sits in). */
export function kanbanCardLabel<T>(
  messages: OgeKanbanBoardMessages,
  card: KanbanCard<T>,
  columns: readonly KanbanColumnDef[],
  selected = false,
): string {
  const column = columns.find((entry) => entry.key === card.column);
  const template =
    selected && messages.cardLabelSelected !== undefined
      ? messages.cardLabelSelected
      : messages.cardLabel;
  return formatKanbanMessage(template, {
    title: card.title,
    column: column !== undefined ? kanbanColumnTitle(column) : card.column,
  });
}

/** The accessible name of a card's edit / delete quick-action button. */
export function kanbanCardActionLabel<T>(
  messages: OgeKanbanBoardMessages,
  action: 'edit' | 'delete',
  card: KanbanCard<T>,
): string {
  return formatKanbanMessage(
    action === 'edit' ? messages.editCardAction : messages.deleteCardAction,
    { title: card.title },
  );
}

/** Up to two initials for an assignee avatar. */
export function kanbanInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Whether a due date lies before today (local calendar day). */
export function isKanbanOverdue(due: Date, now: Date = new Date()): boolean {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return due.getTime() < today.getTime();
}

/** The due-date badge text (`short` month + day, in `locale`). */
export function formatKanbanDue(due: Date, locale: string | undefined): string {
  return ogeDateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(due);
}

/** Capability flags the card chrome and shortcuts depend on. */
export interface KanbanCapabilities {
  readonly canUpdate: boolean;
  readonly canDelete: boolean;
  readonly canDrag: boolean;
  /** F2 inline title editing is available (title is a field name). */
  readonly canEditTitle?: boolean;
  /** `selectionMode: 'multiple'` (Ctrl+A / Ctrl+Space). */
  readonly multiSelect?: boolean;
}

/** A card's `aria-keyshortcuts` (`null` when no shortcut applies). */
export function kanbanCardShortcuts(caps: KanbanCapabilities): string | null {
  const parts: string[] = [];
  if (caps.canUpdate) parts.push('Enter');
  if (caps.canDelete) parts.push('Delete');
  if (caps.canDrag) parts.push('Control+ArrowLeft Control+ArrowRight');
  if (caps.canUpdate && caps.canEditTitle) parts.push('F2');
  if (caps.multiSelect && (caps.canDrag || caps.canDelete)) {
    parts.push('Control+A Control+Space');
  }
  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * One tab stop per column cell (each column list keeps a roving focus of
 * its own); the focused card replaces its own cell's default stop. This
 * is also what keeps every scrollable cell keyboard-reachable — and it is a
 * pure derivation, so the first paint already carries it.
 */
export function kanbanFocusableKeys<T>(
  lanes: readonly KanbanSwimlane<T>[],
  focused: unknown,
): ReadonlySet<unknown> {
  const keys = new Set<unknown>();
  for (const lane of lanes) {
    for (const cell of lane.columns) {
      if (cell.cards.length === 0) continue;
      const focusedHere =
        focused !== null && cell.cards.some((card) => card.key === focused);
      keys.add(focusedHere ? focused : cell.cards[0].key);
    }
  }
  return keys;
}

/** A cell's measured scroll state. */
export interface KanbanCellScroll {
  readonly top: number;
  readonly height: number;
}

/** The key a cell's scroll state is stored under (`lane column`). */
export function kanbanCellKey(lane: string | null, column: string): string {
  return `${lane ?? ''} ${column}`;
}

/**
 * The rendered window of one cell. Without virtualization every card renders;
 * an unmeasured (or jsdom zero-height) cell windows over the fallback height
 * instead of rendering everything.
 */
export function kanbanCellWindow(
  state: KanbanCellScroll | undefined,
  count: number,
  cardHeight: number,
  virtualScrolling: boolean,
): KanbanColumnWindow {
  if (!virtualScrolling) {
    return {
      start: 0,
      end: count,
      offsetY: 0,
      totalHeight: count * (cardHeight + KANBAN_CARD_GAP) - KANBAN_CARD_GAP,
    };
  }
  const height =
    state !== undefined && state.height > 0
      ? state.height
      : KANBAN_DEFAULT_CELL_HEIGHT;
  return computeColumnWindow(
    state?.top ?? 0,
    height,
    count,
    cardHeight,
    KANBAN_CARD_GAP,
  );
}

/**
 * The scrollTop that brings card `index` of a cell fully into view, or `null`
 * when it already is.
 */
export function kanbanScrollIntoViewTop(
  state: KanbanCellScroll,
  index: number,
  cardHeight: number,
): number | null {
  const slot = cardHeight + KANBAN_CARD_GAP;
  const cardTop = index * slot;
  const cardBottom = cardTop + cardHeight;
  let top = state.top;
  if (cardTop < top) top = cardTop;
  else if (cardBottom > top + state.height) top = cardBottom - state.height;
  return top !== state.top ? top : null;
}

/** Card counts per `lane column` cell (unfiltered — WIP is a data fact). */
export function kanbanCellCounts<T>(
  cards: readonly KanbanCard<T>[],
  hasSwimlanes: boolean,
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const card of cards) {
    const key = kanbanCellKey(hasSwimlanes ? card.swimlane : null, card.column);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Card counts per swimlane key (unfiltered). */
export function kanbanLaneCounts<T>(
  cards: readonly KanbanCard<T>[],
): ReadonlyMap<string | null, number> {
  const counts = new Map<string | null, number>();
  for (const card of cards) {
    counts.set(card.swimlane, (counts.get(card.swimlane) ?? 0) + 1);
  }
  return counts;
}

/**
 * A cell's per-swimlane WIP (`column.swimlaneWipLimit` inside one lane), or
 * `null` when the column sets no lane limit or the board has no swimlanes.
 */
export function kanbanCellWip(
  column: KanbanColumnDef,
  lane: string | null,
  cellCounts: ReadonlyMap<string, number>,
  hasSwimlanes: boolean,
): KanbanWipState | null {
  if (!hasSwimlanes || column.swimlaneWipLimit === undefined) return null;
  const state = wipState(
    cellCounts.get(kanbanCellKey(lane, column.key)) ?? 0,
    column.swimlaneWipLimit,
  );
  return state.limit === null ? null : state;
}

/** A lane's total WIP against `swimlaneWipLimits[lane]`, or `null`. */
export function kanbanLaneWip(
  lane: string | null,
  limits: Readonly<Record<string, number>> | undefined,
  laneCounts: ReadonlyMap<string | null, number>,
): KanbanWipState | null {
  if (lane === null || limits === undefined) return null;
  const limit = limits[lane];
  if (limit === undefined) return null;
  const state = wipState(laneCounts.get(lane) ?? 0, limit);
  return state.limit === null ? null : state;
}
