import type { CSSProperties, ReactNode } from 'react';
import type {
  KanbanCard,
  KanbanColumnDef,
  KanbanWipState,
  OgeKanbanCardAddedEvent,
  OgeKanbanCardAddingEvent,
  OgeKanbanCardColorMode,
  OgeKanbanCardDeletedEvent,
  OgeKanbanCardDeletingEvent,
  OgeKanbanCardEvent,
  OgeKanbanCardMovedEvent,
  OgeKanbanCardMovingEvent,
  OgeKanbanCardUpdatedEvent,
  OgeKanbanCardUpdatingEvent,
  OgeKanbanColumn,
  OgeKanbanColumnAddedEvent,
  OgeKanbanColumnAddingEvent,
  OgeKanbanColumnReorderedEvent,
  OgeKanbanEditDialogShowingEventBase,
  OgeKanbanCardTransferredEvent,
  OgeKanbanCardTransferringEvent,
  OgeKanbanColumnSort,
  OgeKanbanExportData,
  OgeKanbanExportOptions,
  OgeKanbanFieldExpr,
  OgeKanbanFilter,
  OgeKanbanFilterExpression,
  OgeKanbanMessages,
  OgeKanbanSelectionMode,
} from '@oge-ui/kanban-engine';
import type { OgeFormItemDefinition } from '@oge-ui/react-forms';

/**
 * Cancelable `onCardEditDialogShowing` payload — one event that is both the
 * veto and the customization point: `formItems` arrives pre-populated with
 * the default form (React `<OgeForm>` items) and the handler may mutate or
 * replace it.
 */
export type OgeKanbanEditDialogShowingEvent<T = unknown> =
  OgeKanbanEditDialogShowingEventBase<T, OgeFormItemDefinition>;

/** Argument of `renderCard` — the React face of `*ogeKanbanCardTemplate`. */
export interface OgeKanbanCardRenderContext<T = unknown> {
  /** The normalized card (its `source` is the original data item). */
  readonly card: KanbanCard<T>;
  /** The column the card renders in. */
  readonly column: KanbanColumnDef;
  /** The swimlane key; `null` on a board without swimlanes. */
  readonly swimlane: string | null;
}

/** Argument of `renderColumnHeader` — the React face of `*ogeKanbanColumnHeaderTemplate`. */
export interface OgeKanbanColumnHeaderRenderContext {
  /** The column being rendered. */
  readonly column: KanbanColumnDef;
  /** Cards currently in the column (across all swimlanes). */
  readonly count: number;
  /** WIP arithmetic for the column. */
  readonly wip: KanbanWipState;
}

/** The imperative surface of `<OgeKanban>` — Angular's public methods. */
export interface OgeKanbanHandle<T = Record<string, unknown>> {
  /** Programmatic insert through the cancelable `onCardAdding` pipeline. */
  addCard(item: T): void;
  /** Programmatic update through the cancelable `onCardUpdating` pipeline. */
  updateCard(original: T, updated: T): void;
  /** Programmatic delete through the cancelable `onCardDeleting` pipeline. */
  deleteCard(item: T): void;
  /** Moves a card (append without `toIndex`) through `onCardMoving`. */
  moveCard(
    key: unknown,
    toColumn: string,
    toIndex?: number,
    toSwimlane?: string | null,
  ): void;
  /** Opens the built-in dialog for an existing card. */
  editCard(card: KanbanCard<T>): void;
  /** Opens the built-in dialog for a new card prefilled into a column/lane. */
  openNewCard(column: string, swimlane: string | null): void;
  /** Closes the edit dialog without saving; fires `onCardEditDialogHidden`. */
  closeDialog(): void;
  /** Collapses every column (the toolbar button). */
  collapseAllColumns(): void;
  /** Expands every column (the toolbar button). */
  expandAllColumns(): void;
  /** Reverts the last change by replaying its inverse through the pipelines. */
  undo(): void;
  /** Re-applies the last undone change. */
  redo(): void;
  /** Whether `undo()` has a step to revert. */
  canUndo(): boolean;
  /** Whether `redo()` has a step to re-apply. */
  canRedo(): boolean;
  /** Selects the given card keys (board order is applied). */
  selectCards(keys: readonly unknown[]): void;
  /** Clears the selection. */
  clearSelection(): void;
  /** Moves several cards into one cell as one undoable step. */
  moveCards(
    keys: readonly unknown[],
    toColumn: string,
    toIndex?: number,
    toSwimlane?: string | null,
  ): void;
  /** Deletes several items as one undoable step. */
  deleteCards(items: readonly T[]): void;
  /** Sends cards to another board of the same `dragGroup`; `true` = accepted. */
  transferCards(
    keys: readonly unknown[],
    toBoard: string,
    toColumn?: string,
    toIndex?: number,
    toSwimlane?: string | null,
  ): boolean;
  /** Toggles checklist entry `index` of a card through `onCardUpdating`. */
  toggleChecklistItem(key: unknown, index: number): void;
  /** Starts inline title editing on a card (also F2). */
  startTitleEdit(key: unknown): void;
  /** Clears the filter chip bar. */
  clearFilters(): void;
  /** The cards as export rows in board order. */
  getExportData(options?: OgeKanbanExportOptions): OgeKanbanExportData;
  /** Builds the formula-guarded CSV, downloads it and returns the text. */
  exportToCsv(fileName?: string, options?: OgeKanbanExportOptions): string;
}

/** Props of `<OgeKanban>` — Angular's inputs, models and outputs. */
export interface OgeKanbanProps<T extends object = Record<string, unknown>> {
  // ---------------- data ----------------
  /** Card items; the array and its items are never mutated. */
  dataSource?: readonly T[];
  /** Card key field or getter. Default `'id'`. */
  keyExpr?: OgeKanbanFieldExpr<T>;
  /** The field holding a card's column key. Default `'status'`. */
  columnExpr?: OgeKanbanFieldExpr<T>;
  /** Card title field or getter. Default `'title'`. */
  titleExpr?: OgeKanbanFieldExpr<T>;
  /** Card description field or getter. Default `'description'`. */
  descriptionExpr?: OgeKanbanFieldExpr<T>;
  /** Card color field or getter. Default `'color'`. */
  colorExpr?: OgeKanbanFieldExpr<T>;
  /** In-column sort order; unset = the array order is the board order. */
  orderExpr?: OgeKanbanFieldExpr<T>;
  /** Swimlane field or getter; set = the board renders swimlane rows. */
  swimlaneExpr?: OgeKanbanFieldExpr<T>;
  /** Tag list field (single value or array). */
  tagsExpr?: OgeKanbanFieldExpr<T>;
  /** Assignee field (single value or array). */
  assigneeExpr?: OgeKanbanFieldExpr<T>;
  /** Due-date field or getter. */
  dueDateExpr?: OgeKanbanFieldExpr<T>;
  /** Priority field or getter (rendered as a colored indicator). */
  priorityExpr?: OgeKanbanFieldExpr<T>;
  /** Extra fields the toolbar search matches, beyond the card's own texts. */
  searchExprs?: readonly OgeKanbanFieldExpr<T>[];
  /** Declared columns; unset = derived from the data in first-seen order. */
  columns?: readonly OgeKanbanColumn[];

  // ---------------- state (controlled / uncontrolled pairs) ----------------
  /** Collapsed column keys — controlled when provided. */
  collapsedColumns?: readonly string[];
  /** Uncontrolled initial collapsed column keys. */
  defaultCollapsedColumns?: readonly string[];
  /** The controlled half of `collapsedColumns`. */
  onCollapsedColumnsChange?: (keys: readonly string[]) => void;
  /** Collapsed swimlane keys — controlled when provided. */
  collapsedSwimlanes?: readonly string[];
  /** Uncontrolled initial collapsed swimlane keys. */
  defaultCollapsedSwimlanes?: readonly string[];
  /** The controlled half of `collapsedSwimlanes`. */
  onCollapsedSwimlanesChange?: (keys: readonly string[]) => void;
  /** Persisted column key order — controlled when provided (empty = declared order). */
  columnOrder?: readonly string[];
  /** Uncontrolled initial column order. */
  defaultColumnOrder?: readonly string[];
  /** The controlled half of `columnOrder`. */
  onColumnOrderChange?: (order: readonly string[]) => void;
  /** The selected card's key — controlled when provided (single selection). */
  selectedCardKey?: unknown;
  /** Uncontrolled initial selection. */
  defaultSelectedCardKey?: unknown;
  /** The controlled half of `selectedCardKey`. */
  onSelectedCardKeyChange?: (key: unknown) => void;

  // ---------------- behavior ----------------
  /** Per-column card windowing over a fixed card height. Default `true`. */
  virtualScrolling?: boolean;
  /** Fixed card height in px; unset = the config's (112). */
  cardHeight?: number;
  /** Per-instance message overrides (merged over the config). */
  messages?: Partial<OgeKanbanMessages>;
  /** BCP 47 locale for date formats; unset = config, then browser. */
  locale?: string;
  /** Shows the built-in toolbar (add, collapse, search). Default `true`. */
  showToolbar?: boolean;
  /** Allows creating cards. Default `true`. */
  allowAdding?: boolean;
  /** Allows editing cards. Default `true`. */
  allowUpdating?: boolean;
  /** Allows deleting cards. Default `true`. */
  allowDeleting?: boolean;
  /** Allows dragging cards (and the Ctrl+Arrow keyboard twin). Default `true`. */
  allowDragging?: boolean;
  /** Allows dragging column headers to reorder columns. Default `false`. */
  allowColumnReordering?: boolean;
  /** Shows the "+ Add column" ghost column. Default `false`. */
  allowColumnAdding?: boolean;
  /** One switch over every `allow*` capability. Default `false`. */
  readOnly?: boolean;
  /** Column track width in px. Default `300`. */
  columnWidth?: number;
  /** How `colorExpr` renders. Default `'stripe'`. */
  cardColorMode?: OgeKanbanCardColorMode;
  /**
   * Right-to-left layout: the first column on the right, ArrowLeft/Right
   * (and Ctrl+Arrow moves) mirrored. Unset follows the page — the computed
   * `direction` or the nearest `dir`, read after mount and kept current; an
   * explicit value also sets `dir` on the host.
   */
  rtlEnabled?: boolean;
  /** Replaces the edit dialog's default form wholesale (`<OgeForm>` items). */
  dialogItems?: readonly OgeFormItemDefinition[];

  // ---------------- filtering, sorting, selection, transfers ----------------
  /** Checklist / sub-task field: `{ text, done }` items (progress badge on the card). */
  checklistExpr?: OgeKanbanFieldExpr<T>;
  /** Programmatic card filter (predicate or expression), ANDed with chips and search. */
  filter?: OgeKanbanFilter<T>;
  /** The filter chip bar's state — controlled when provided. */
  filterValue?: OgeKanbanFilterExpression;
  /** Uncontrolled initial chip state. */
  defaultFilterValue?: OgeKanbanFilterExpression;
  /** The controlled half of `filterValue`. */
  onFilterValueChange?: (value: OgeKanbanFilterExpression) => void;
  /** Shows the filter chip bar (tags, assignees, priorities). Default `false`. */
  showFilterBar?: boolean;
  /** Per-column card sort — controlled when provided (`'*'` = every column). */
  columnSort?: OgeKanbanColumnSort<T>;
  /** Uncontrolled initial column sort. */
  defaultColumnSort?: OgeKanbanColumnSort<T>;
  /** The controlled half of `columnSort` (the column menu writes it). */
  onColumnSortChange?: (sort: OgeKanbanColumnSort<T>) => void;
  /** Priority ranking for sorting by priority (highest first). */
  priorityOrder?: readonly string[];
  /** `'multiple'` adds Ctrl/Shift-click, Ctrl+A and multi-card drag. Default `'multiple'`. */
  selectionMode?: OgeKanbanSelectionMode;
  /** Every selected card key — controlled when provided. */
  selectedCardKeys?: readonly unknown[];
  /** Uncontrolled initial selection set. */
  defaultSelectedCardKeys?: readonly unknown[];
  /** The controlled half of `selectedCardKeys`. */
  onSelectedCardKeysChange?: (keys: readonly unknown[]) => void;
  /** Boards sharing a `dragGroup` exchange cards by drag and "Move to …". */
  dragGroup?: string;
  /** Names this board in transfer events and the other boards' menus. */
  boardId?: string;
  /** Per-lane total WIP limits, keyed by swimlane value. */
  swimlaneWipLimits?: Readonly<Record<string, number>>;
  /** The column footer's add button opens an inline title composer. Default `false`. */
  quickAdd?: boolean;
  /** Double-clicking a card title edits it inline (F2 always does). Default `false`. */
  inlineTitleEditing?: boolean;
  /** Undo/redo depth (Ctrl+Z / Ctrl+Y, toolbar buttons); `0` disables. Default `50`. */
  undoLimit?: number;
  /** Cancelable, on the target board: cards from another board are about to land. */
  onCardTransferring?: (event: OgeKanbanCardTransferringEvent<T>) => void;
  /** On both boards: a cross-board transfer landed. */
  onCardTransferred?: (event: OgeKanbanCardTransferredEvent<T>) => void;

  // ---------------- callbacks (Angular outputs) ----------------
  /** A card was clicked (also selects it). */
  onCardClick?: (event: OgeKanbanCardEvent<T>) => void;
  /** A card was double-clicked (also opens the editor when allowed). */
  onCardDblClick?: (event: OgeKanbanCardEvent<T>) => void;
  /** A card was right-clicked; fires before the built-in menu opens. */
  onCardContextMenu?: (event: OgeKanbanCardEvent<T>) => void;
  /** Cancelable: before a new card reaches the data. */
  onCardAdding?: (event: OgeKanbanCardAddingEvent<T>) => void;
  /** A new card was added. */
  onCardAdded?: (event: OgeKanbanCardAddedEvent<T>) => void;
  /** Cancelable: before an edit reaches the data. */
  onCardUpdating?: (event: OgeKanbanCardUpdatingEvent<T>) => void;
  /** A card was updated. */
  onCardUpdated?: (event: OgeKanbanCardUpdatedEvent<T>) => void;
  /** Cancelable: before a card is removed from the data. */
  onCardDeleting?: (event: OgeKanbanCardDeletingEvent<T>) => void;
  /** A card was deleted. */
  onCardDeleted?: (event: OgeKanbanCardDeletedEvent<T>) => void;
  /** Cancelable: before a card moves (drag, keyboard or programmatic). */
  onCardMoving?: (event: OgeKanbanCardMovingEvent<T>) => void;
  /** A card was moved. */
  onCardMoved?: (event: OgeKanbanCardMovedEvent<T>) => void;
  /** Cancelable + customization point: before the edit dialog opens. */
  onCardEditDialogShowing?: (event: OgeKanbanEditDialogShowingEvent<T>) => void;
  /** The edit dialog closed (saved, cancelled, deleted or `closeDialog()`). */
  onCardEditDialogHidden?: () => void;
  /** A column header drag committed a new column order. */
  onColumnReordered?: (event: OgeKanbanColumnReorderedEvent) => void;
  /** Cancelable: before the "+ Add column" affordance creates a column. */
  onColumnAdding?: (event: OgeKanbanColumnAddingEvent) => void;
  /** A column was added at runtime. */
  onColumnAdded?: (event: OgeKanbanColumnAddedEvent) => void;

  // ---------------- render props (Angular templates) ----------------
  /** Replaces the card body; drag, keyboard and ARIA stay on the board. */
  renderCard?: (context: OgeKanbanCardRenderContext<T>) => ReactNode;
  /** Replaces the column header's title row (the collapse affordance stays). */
  renderColumnHeader?: (
    context: OgeKanbanColumnHeaderRenderContext,
  ) => ReactNode;

  className?: string;
  style?: CSSProperties;
}
