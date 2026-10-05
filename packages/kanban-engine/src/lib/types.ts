/**
 * Public option and event types of the Kanban, shared by both render layers.
 * Event payloads follow the house shape: flat exported interfaces, the raw
 * DOM event under `event`, no component back-reference; cancelable
 * pre-events carry a mutable `cancel` and every other member is readonly.
 */
import type { OgeFormItemDataBase } from '@oge-ui/behavior';
import type { KanbanCard, KanbanColumnDef } from './board-model';

/** A column definition of the board. */
export type OgeKanbanColumn = KanbanColumnDef;

/** A normalized card as handed to templates and events. */
export type OgeKanbanCard<T = unknown> = KanbanCard<T>;

/** A field mapping: a field name (dotted paths ok) or a getter function. */
export type OgeKanbanFieldExpr<T> = string | ((item: T) => unknown);

/** Card pointer-interaction payload (`cardClick` / `cardDblClick` / `cardContextMenu`). */
export interface OgeKanbanCardEvent<T = unknown> {
  readonly card: OgeKanbanCard<T>;
  readonly event: MouseEvent;
}

/** Cancelable `cardAdding` payload. */
export interface OgeKanbanCardAddingEvent<T = unknown> {
  /** The item about to be inserted into the data. */
  readonly card: T;
  readonly column: string;
  readonly swimlane: string | null;
  cancel: boolean;
}

/** `cardAdded` payload. */
export interface OgeKanbanCardAddedEvent<T = unknown> {
  readonly card: T;
  readonly column: string;
  readonly swimlane: string | null;
}

/** Cancelable `cardUpdating` payload. */
export interface OgeKanbanCardUpdatingEvent<T = unknown> {
  readonly oldData: T;
  readonly newData: T;
  cancel: boolean;
}

/** `cardUpdated` payload. */
export interface OgeKanbanCardUpdatedEvent<T = unknown> {
  readonly oldData: T;
  readonly newData: T;
}

/** Cancelable `cardDeleting` payload. */
export interface OgeKanbanCardDeletingEvent<T = unknown> {
  readonly card: T;
  cancel: boolean;
}

/** `cardDeleted` payload. */
export interface OgeKanbanCardDeletedEvent<T = unknown> {
  readonly card: T;
}

/** Cancelable `cardMoving` payload — drag, keyboard and programmatic moves alike. */
export interface OgeKanbanCardMovingEvent<T = unknown> {
  readonly card: T;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly fromSwimlane: string | null;
  readonly toSwimlane: string | null;
  cancel: boolean;
}

/** `cardMoved` payload. */
export interface OgeKanbanCardMovedEvent<T = unknown> {
  readonly card: T;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly fromIndex: number;
  readonly toIndex: number;
  readonly fromSwimlane: string | null;
  readonly toSwimlane: string | null;
}

/**
 * Cancelable `cardEditDialogShowing` payload — one event that is both the
 * veto and the customization point: `formItems` arrives pre-populated with
 * the default form and the handler may mutate or replace it. `TItem` is the
 * render layer's form item type (Angular's `OgeFormItemData`, React's
 * `OgeFormItemDefinition`) — both extend the shared base.
 */
export interface OgeKanbanEditDialogShowingEventBase<
  T = unknown,
  TItem extends OgeFormItemDataBase = OgeFormItemDataBase,
> {
  /** The item being edited; `null` while creating. */
  readonly card: T | null;
  readonly isNew: boolean;
  /** The column the editor opens into. */
  readonly column: string;
  formItems: TItem[];
  cancel: boolean;
}

/** Cancelable `columnAdding` payload (the "+ Add column" affordance). */
export interface OgeKanbanColumnAddingEvent {
  readonly column: KanbanColumnDef;
  cancel: boolean;
}

/** `columnAdded` payload. */
export interface OgeKanbanColumnAddedEvent {
  readonly column: KanbanColumnDef;
}

/** `columnReordered` payload. */
export interface OgeKanbanColumnReorderedEvent {
  readonly column: OgeKanbanColumn;
  readonly fromIndex: number;
  readonly toIndex: number;
  /** The full column key order after the reorder. */
  readonly columnOrder: readonly string[];
}

/**
 * Cancelable `cardTransferring` payload — fired by the **target** board when
 * cards dragged from another board of the same `dragGroup` (or sent with the
 * menu's "Move to …") are about to land on it.
 */
export interface OgeKanbanCardTransferringEvent<T = unknown> {
  /** The source items, in board order (not yet re-columned). */
  readonly cards: readonly T[];
  readonly fromBoard: string;
  readonly toBoard: string;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly fromSwimlane: string | null;
  readonly toSwimlane: string | null;
  /** Insertion index in the target cell. */
  readonly toIndex: number;
  cancel: boolean;
}

/**
 * `cardTransferred` payload — fired by **both** boards after a transfer
 * landed: the source host removes `sourceCards` from its data, the target
 * host adds `cards` (column / swimlane already written).
 */
export interface OgeKanbanCardTransferredEvent<T = unknown> {
  /** The items as they landed on the target board. */
  readonly cards: readonly T[];
  /** The items as they left the source board. */
  readonly sourceCards: readonly T[];
  readonly fromBoard: string;
  readonly toBoard: string;
  readonly fromColumn: string;
  readonly toColumn: string;
  readonly fromSwimlane: string | null;
  readonly toSwimlane: string | null;
  readonly toIndex: number;
}

/** How `colorExpr` renders on a card. */
export type OgeKanbanCardColorMode = 'stripe' | 'surface';
